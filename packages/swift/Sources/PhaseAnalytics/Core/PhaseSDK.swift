import Foundation

#if canImport(UIKit)
    import UIKit
#endif

public final class PhaseSDK: Sendable {
    public static let shared = PhaseSDK()

    private let httpClient: ThreadSafeLock<HTTPClient?>
    private let offlineQueue: ThreadSafeLock<OfflineQueue?>
    private let batchSender: ThreadSafeLock<BatchSender?>
    private let deviceManager: ThreadSafeLock<DeviceManager?>
    private let sessionManager: ThreadSafeLock<SessionManager?>
    private let eventManager: ThreadSafeLock<EventManager?>

    private let isInitialized: ThreadSafeLock<Bool>
    private let isIdentified: ThreadSafeLock<Bool>
    private let initializationTask: ThreadSafeLock<Task<Void, Error>?>
    private let networkUnsubscribe: ThreadSafeLock<UnsubscribeFn?>
    private let appStateObservers: ThreadSafeLock<[Any]>
    private let pendingCalls: ThreadSafeLock<[@Sendable () async -> Void]>

    private let networkAdapter: ThreadSafeLock<NetworkAdapter?>
    private let storage: StorageAdapter

    internal init(storage: StorageAdapter = UserDefaultsStorage()) {
        self.storage = storage
        self.httpClient = ThreadSafeLock(nil)
        self.offlineQueue = ThreadSafeLock(nil)
        self.batchSender = ThreadSafeLock(nil)
        self.deviceManager = ThreadSafeLock(nil)
        self.sessionManager = ThreadSafeLock(nil)
        self.eventManager = ThreadSafeLock(nil)
        self.isInitialized = ThreadSafeLock(false)
        self.isIdentified = ThreadSafeLock(false)
        self.initializationTask = ThreadSafeLock(nil)
        self.networkUnsubscribe = ThreadSafeLock(nil)
        self.appStateObservers = ThreadSafeLock([])
        self.pendingCalls = ThreadSafeLock([])
        self.networkAdapter = ThreadSafeLock(nil)
    }

    /// Initialize the SDK (required before tracking)
    ///
    /// - Parameters:
    ///   - apiKey: Phase API key (required, starts with `phase_`)
    ///   - baseURL: Custom API endpoint (optional, default: "https://api.phase.sh")
    ///   - logLevel: Logging level (optional, default: `.none`)
    ///   - deviceInfo: Collect device metadata (optional, default: `true`)
    ///   - userLocale: Collect locale & geolocation (optional, default: `true`)
    ///
    /// - Throws: `PhaseError.invalidAPIKey`
    ///
    /// ## Example
    /// ```swift
    /// try await PhaseSDK.shared.initialize(apiKey: "phase_xxx")
    /// ```
    public func initialize(
        apiKey: String,
        baseURL: String = "https://api.phase.sh",
        logLevel: LogLevel = .none,
        deviceInfo: Bool = true,
        userLocale: Bool = true
    ) async throws {
        let config = PhaseConfig(
            apiKey: apiKey,
            baseURL: baseURL,
            logLevel: logLevel,
            deviceInfo: deviceInfo,
            userLocale: userLocale
        )

        #if canImport(UIKit)
            try await _initialize(
                config: config,
                getDeviceInfo: getIOSDeviceInfo,
                networkAdapter: NetworkMonitor()
            )
        #else
            try await _initialize(
                config: config,
                getDeviceInfo: { DeviceInfo(deviceType: nil, osVersion: nil, platform: nil, locale: nil) },
                networkAdapter: NetworkMonitor()
            )
        #endif
    }

    internal func _initialize(
        config: PhaseConfig,
        getDeviceInfo: @escaping @Sendable () -> DeviceInfo,
        networkAdapter: NetworkAdapter
    ) async throws {
        if isInitialized.withLock({ $0 }) {
            logger.debug("SDK already initialized, skipping init")
            return
        }

        // If initialization is already in progress, wait for it to complete
        if let existingTask = initializationTask.withLock({ $0 }) {
            logger.debug("SDK initialization already in progress, waiting")
            try await existingTask.value
            return
        }

        let task = Task<Void, Error> {
            try await doInitialize(config: config, getDeviceInfo: getDeviceInfo, networkAdapter: networkAdapter)
        }
        initializationTask.withLock { $0 = task }

        do {
            try await task.value
            initializationTask.withLock { $0 = nil }
        } catch {
            initializationTask.withLock { $0 = nil }

            let pendingToCancel = pendingCalls.withLock { calls in
                let current = calls
                calls.removeAll()
                return current
            }

            if !pendingToCancel.isEmpty {
                logger.error("Clearing \(pendingToCancel.count) queued calls due to initialization failure")
            }

            throw error
        }
    }

    private func doInitialize(
        config: PhaseConfig,
        getDeviceInfo: @escaping @Sendable () -> DeviceInfo,
        networkAdapter: NetworkAdapter
    ) async throws {

        guard !config.apiKey.isEmpty, !config.apiKey.trimmingCharacters(in: .whitespaces).isEmpty else {
            logger.error("API key is required. Please provide a valid API key.")
            throw PhaseError.invalidAPIKey
        }

        guard config.apiKey.hasPrefix("phase_") else {
            logger.error("Invalid API key format. API key must start with 'phase_'")
            throw PhaseError.invalidAPIKey
        }

        logger.setLogLevel(config.logLevel)
        self.networkAdapter.withLock { $0 = networkAdapter }

        let netState = await networkAdapter.fetchNetworkState()
        let isOnline = netState.isConnected

        logger.info("Initializing Phase SDK (baseURL: \(config.baseURL), isOnline: \(isOnline))")

        let client = HTTPClient(apiKey: config.apiKey, baseURL: config.baseURL)
        httpClient.withLock { $0 = client }

        let queue = OfflineQueue(storage: storage)
        await queue.initialize()
        offlineQueue.withLock { $0 = queue }

        let sender = BatchSender(httpClient: client, offlineQueue: queue)
        batchSender.withLock { $0 = sender }

        let devManager = DeviceManager(
            httpClient: client,
            offlineQueue: queue,
            storage: storage,
            getDeviceInfo: getDeviceInfo,
            config: config
        )
        let deviceID = await devManager.initialize(isOnline: isOnline)
        deviceManager.withLock { $0 = devManager }

        let sessManager = SessionManager(
            httpClient: client,
            offlineQueue: queue,
            deviceID: deviceID
        )
        sessionManager.withLock { $0 = sessManager }

        let evtManager = EventManager(
            httpClient: client,
            offlineQueue: queue,
            getSessionID: { [weak self] in
                guard let self = self else { return nil }
                return await self.sessionManager.withLock({ $0 })?.getSessionID()
            }
        )
        eventManager.withLock { $0 = evtManager }

        setupNetworkListener()
        setupAppStateListener()

        isInitialized.withLock { $0 = true }
        logger.info("Phase SDK initialized successfully. Call identify() to start tracking.")

        await processPendingCalls()
    }

    /// Register device and start session
    ///
    /// - Parameter properties: Custom device attributes (optional, primitives only)
    ///
    /// ## Example
    /// ```swift
    /// // Basic usage
    /// await PhaseSDK.shared.identify()
    ///
    /// // After login
    /// await PhaseSDK.shared.identify(["user_id": "123", "plan": "premium"])
    /// ```
    public func identify(_ properties: DeviceProperties? = nil) async {
        guard isInitialized.withLock({ $0 }) else {
            logger.debug("SDK not ready yet, queuing identify() call")
            await withCheckedContinuation { continuation in
                pendingCalls.withLock { calls in
                    calls.append {
                        await self.identify(properties)
                        continuation.resume()
                    }
                }
            }
            return
        }

        guard !isIdentified.withLock({ $0 }) else {
            logger.debug("Device already identified, skipping")
            return
        }

        guard let devManager = deviceManager.withLock({ $0 }),
            let sessManager = sessionManager.withLock({ $0 }),
            let adapter = networkAdapter.withLock({ $0 })
        else {
            logger.error("SDK components not ready")
            return
        }

        let netState = await adapter.fetchNetworkState()
        let isOnline = netState.isConnected

        await devManager.identify(isOnline: isOnline, properties: properties)
        _ = await sessManager.start(isOnline: isOnline)

        isIdentified.withLock { $0 = true }
        logger.info("Device identified and session started")

        await processPendingCalls()
    }

    /// Track custom event
    ///
    /// Calls are automatically queued if SDK is not ready yet.
    ///
    /// - Parameters:
    ///   - name: Event name (required, alphanumeric, `_`, `-`, `.`, `/`)
    ///   - params: Event parameters (optional, primitives only)
    ///
    /// ## Example
    /// ```swift
    /// PhaseSDK.shared.track("purchase", params: ["amount": 99.99, "currency": "USD"])
    /// ```
    public func track(_ name: String, params: EventParams? = nil) {
        guard isInitialized.withLock({ $0 }) else {
            logger.debug("SDK not ready yet, queuing track() call")
            pendingCalls.withLock { calls in
                calls.append {
                    self.track(name, params: params)
                }
            }
            return
        }

        guard isIdentified.withLock({ $0 }) else {
            logger.debug("Device not identified yet, queuing track() call")
            pendingCalls.withLock { calls in
                calls.append {
                    self.track(name, params: params)
                }
            }
            return
        }

        guard let evtManager = eventManager.withLock({ $0 }) else {
            logger.error("Event manager not available")
            return
        }

        Task {
            await evtManager.track(name: name, params: params, isScreen: false)
        }
    }

    /// Track screen view (for SwiftUI, prefer `.phaseScreen()` modifier)
    ///
    /// - Parameters:
    ///   - name: Screen name (required, use path format like "/home")
    ///   - params: Additional parameters (optional, primitives only)
    ///
    /// ## Example
    /// ```swift
    /// PhaseSDK.shared.trackScreen("/profile", params: ["user_id": "123"])
    /// ```
    public func trackScreen(_ name: String, params: EventParams? = nil) {
        guard isInitialized.withLock({ $0 }) else {
            logger.debug("SDK not ready yet, queuing trackScreen() call")
            pendingCalls.withLock { calls in
                calls.append {
                    self.trackScreen(name, params: params)
                }
            }
            return
        }

        guard isIdentified.withLock({ $0 }) else {
            logger.debug("Device not identified yet, queuing trackScreen() call")
            pendingCalls.withLock { calls in
                calls.append {
                    self.trackScreen(name, params: params)
                }
            }
            return
        }

        guard let evtManager = eventManager.withLock({ $0 }) else {
            logger.error("Event manager not available")
            return
        }

        Task {
            await evtManager.track(name: name, params: params, isScreen: true)
        }
    }

    /// Track custom event (static convenience method)
    ///
    /// - Parameters:
    ///   - name: Event name (required, alphanumeric, `_`, `-`, `.`, `/`)
    ///   - params: Event parameters (optional, primitives only)
    ///
    /// ## Example
    /// ```swift
    /// track("purchase", ["amount": 99.99, "currency": "USD"])
    /// ```
    public static func track(_ name: String, _ params: [String: Any]? = nil) {
        let eventParams = params.map { EventParams($0) }
        shared.track(name, params: eventParams)
    }

    /// Track screen view (static convenience method)
    ///
    /// - Parameters:
    ///   - name: Screen name (required, use path format like "/home")
    ///   - params: Additional parameters (optional, primitives only)
    ///
    /// ## Example
    /// ```swift
    /// trackScreen("/profile", ["user_id": "123"])
    /// ```
    public static func trackScreen(_ name: String, _ params: [String: Any]? = nil) {
        let eventParams = params.map { EventParams($0) }
        shared.trackScreen(name, params: eventParams)
    }

    private func processPendingCalls() async {
        let calls = pendingCalls.withLock { calls in
            let current = calls
            calls.removeAll()
            return current
        }

        guard !calls.isEmpty else { return }

        logger.info("Processing \(calls.count) queued calls")

        for call in calls {
            await call()
        }
    }

    // Cached regex patterns for performance
    private static let camelCaseRegex = try? NSRegularExpression(pattern: "([a-z])([A-Z])")
    private static let numericSegmentRegex = try? NSRegularExpression(pattern: "/\\d+")

    /// Normalize path to match server-side normalization
    /// - "HomeView" → "/home-view" (CamelCase to kebab)
    /// - "/users/123" → "/users/:id" (numeric segments)
    /// - "//home//" → "/home" (multiple slashes, trailing slash)
    /// - "/path?query#hash" → "/path" (query string, hash removed)
    internal static func formatScreenName(_ name: String) -> String {
        var path = name

        if let queryIndex = path.firstIndex(of: "?") {
            path = String(path[..<queryIndex])
        }
        if let hashIndex = path.firstIndex(of: "#") {
            path = String(path[..<hashIndex])
        }

        if let regex = camelCaseRegex {
            let range = NSRange(path.startIndex..., in: path)
            path = regex.stringByReplacingMatches(in: path, range: range, withTemplate: "$1-$2")
        }

        path = path.lowercased()

        while path.contains("//") {
            path = path.replacingOccurrences(of: "//", with: "/")
        }

        if let regex = numericSegmentRegex {
            let range = NSRange(path.startIndex..., in: path)
            path = regex.stringByReplacingMatches(in: path, range: range, withTemplate: "/:id")
        }

        if path.hasSuffix("/") && path.count > 1 {
            path = String(path.dropLast())
        }

        if !path.hasPrefix("/") {
            path = "/" + path
        }

        return path.isEmpty ? "/" : path
    }

    #if canImport(UIKit)
        private func setupAppStateListener() {
            let backgroundObserver = NotificationCenter.default.addObserver(
                forName: UIApplication.didEnterBackgroundNotification,
                object: nil,
                queue: .main
            ) { [weak self] _ in
                logger.debug("App backgrounded, pausing session ping")
                Task {
                    await self?.sessionManager.withLock({ $0 })?.pause()
                }
            }

            let foregroundObserver = NotificationCenter.default.addObserver(
                forName: UIApplication.willEnterForegroundNotification,
                object: nil,
                queue: .main
            ) { [weak self] _ in
                logger.debug("App foregrounded, resuming session ping")
                Task {
                    await self?.sessionManager.withLock({ $0 })?.resume()
                }
            }

            appStateObservers.withLock { $0 = [backgroundObserver, foregroundObserver] }
        }
    #else
        private func setupAppStateListener() {
        }
    #endif

    private func setupNetworkListener() {
        guard let adapter = networkAdapter.withLock({ $0 }) else {
            logger.error("Network adapter not initialized")
            return
        }

        let unsubscribe = adapter.addNetworkListener { [weak self] state in
            let isOnline = state.isConnected

            Task {
                await self?.sessionManager.withLock({ $0 })?.updateNetworkState(isOnline: isOnline)
                await self?.eventManager.withLock({ $0 })?.updateNetworkState(isOnline: isOnline)

                if isOnline, let self = self, self.isIdentified.withLock({ $0 }) {
                    if let queue = self.offlineQueue.withLock({ $0 }) {
                        let queueSize = await queue.getSize()
                        if queueSize > 0 {
                            logger.info("Network restored, flushing offline queue")
                            if let sender = self.batchSender.withLock({ $0 }) {
                                await sender.flush()
                            }
                        }
                    }
                }
            }
        }

        networkUnsubscribe.withLock { $0 = unsubscribe }
    }

    deinit {
        networkUnsubscribe.withLock { $0?() }

        #if canImport(UIKit)
            appStateObservers.withLock { observers in
                for observer in observers {
                    NotificationCenter.default.removeObserver(observer)
                }
            }
        #endif
    }
}

/// Track custom event
///
/// - Parameters:
///   - name: Event name (required, alphanumeric, `_`, `-`, `.`, `/`)
///   - params: Event parameters (optional, primitives only)
///
/// ## Example
/// ```swift
/// track("purchase", ["amount": 99.99, "currency": "USD"])
/// ```
public func track(_ name: String, _ params: [String: Any]? = nil) {
    PhaseSDK.track(name, params)
}

/// Track screen view
///
/// - Parameters:
///   - name: Screen name (required, use path format like "/home")
///   - params: Additional parameters (optional, primitives only)
///
/// ## Example
/// ```swift
/// trackScreen("/profile", ["user_id": "123"])
/// ```
public func trackScreen(_ name: String, _ params: [String: Any]? = nil) {
    PhaseSDK.trackScreen(name, params)
}

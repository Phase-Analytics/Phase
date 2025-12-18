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
    private let initializationTask: ThreadSafeLock<Task<Void, Error>?>
    private let networkUnsubscribe: ThreadSafeLock<UnsubscribeFn?>
    private let appStateObservers: ThreadSafeLock<[Any]>

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
        self.initializationTask = ThreadSafeLock(nil)
        self.networkUnsubscribe = ThreadSafeLock(nil)
        self.appStateObservers = ThreadSafeLock([])
        self.networkAdapter = ThreadSafeLock(nil)
    }

    /// Initialize Phase Analytics SDK
    ///
    /// Call this once at app startup before tracking events.
    /// Or use the `Phase` SwiftUI component which calls this automatically.
    ///
    /// - Parameters:
    ///   - apiKey: Your Phase API key (required, starts with "phase_")
    ///   - baseURL: Custom API endpoint for self-hosting (optional, default: "https://api.phase.sh")
    ///   - logLevel: Logging level (optional, default: `.none`)
    ///   - deviceInfo: Collect device metadata (optional, default: `true`)
    ///   - userLocale: Collect user locale + geolocation (optional, default: `true`)
    ///
    /// - Throws: `PhaseError.invalidAPIKey` if API key is missing or invalid format
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

        try await _initialize(
            config: config,
            getDeviceInfo: getIOSDeviceInfo,
            networkAdapter: NetworkMonitor()
        )
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
        _ = await sessManager.start(isOnline: isOnline)
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

        if isOnline {
            let queueSize = await queue.getSize()
            if queueSize > 0 {
                logger.info("Online at startup, flushing offline queue")
                Task {
                    await sender.flush()
                }
            }
        }

        isInitialized.withLock { $0 = true }
        logger.info("Phase SDK initialized successfully")
    }

    /// Track a custom event
    ///
    /// - Parameters:
    ///   - name: Event name (1-256 chars, alphanumeric + `.` `/` `-` `_`)
    ///   - params: Event parameters (optional, max depth 6, max size 50KB)
    ///
    /// ## Example
    /// ```swift
    /// PhaseSDK.shared.track("button_click", params: ["button_id": "submit"])
    /// // or static method:
    /// PhaseSDK.track("purchase", ["amount": 99.99])
    /// ```
    public func track(_ name: String, params: EventParams? = nil) {
        guard isInitialized.withLock({ $0 }) else {
            logger.error("SDK not initialized. Call initialize() first.")
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

    /// Track a screen view
    ///
    /// Use this for manual screen tracking. For SwiftUI, prefer `.phaseScreen()` modifier.
    ///
    /// - Parameters:
    ///   - name: Screen name (will be tracked as-is, use path format like "/home")
    ///   - params: Additional parameters (optional)
    ///
    /// ## Example
    /// ```swift
    /// PhaseSDK.shared.trackScreen("/profile", params: ["user_id": "123"])
    /// ```
    public func trackScreen(_ name: String, params: EventParams? = nil) {
        guard isInitialized.withLock({ $0 }) else {
            logger.error("SDK not initialized. Call initialize() first.")
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

    /// Track a custom event (static convenience method)
    ///
    /// - Parameters:
    ///   - name: Event name (1-256 chars, alphanumeric + `.` `/` `-` `_`)
    ///   - params: Event parameters as dictionary (optional)
    ///
    /// ## Example
    /// ```swift
    /// import PhaseAnalytics
    ///
    /// track("button_click", ["button_id": "submit"])
    /// ```
    public static func track(_ name: String, _ params: [String: Any]? = nil) {
        let eventParams = params.map { EventParams($0) }
        shared.track(name, params: eventParams)
    }

    /// Track a screen view (static convenience method)
    ///
    /// - Parameters:
    ///   - name: Screen name (use path format like "/home")
    ///   - params: Additional parameters (optional)
    ///
    /// ## Example
    /// ```swift
    /// import PhaseAnalytics
    ///
    /// trackScreen("/profile", ["user_id": "123"])
    /// ```
    public static func trackScreen(_ name: String, _ params: [String: Any]? = nil) {
        let eventParams = params.map { EventParams($0) }
        shared.trackScreen(name, params: eventParams)
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

                if isOnline {
                    if let queue = self?.offlineQueue.withLock({ $0 }) {
                        let queueSize = await queue.getSize()
                        if queueSize > 0 {
                            logger.info("Network restored, flushing offline queue")
                            if let sender = self?.batchSender.withLock({ $0 }) {
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

/// Track a custom event
///
/// - Parameters:
///   - name: Event name (1-256 chars, alphanumeric + `.` `/` `-` `_`)
///   - params: Event parameters as dictionary (optional, max depth 6, max size 50KB)
///
/// ## Example
/// ```swift
/// import PhaseAnalytics
///
/// track("button_click", ["button_id": "submit"])
/// track("purchase", ["amount": 99.99, "currency": "USD"])
/// ```
public func track(_ name: String, _ params: [String: Any]? = nil) {
    PhaseSDK.track(name, params)
}

/// Track a screen view
///
/// - Parameters:
///   - name: Screen name (use path format like "/home" or "HomeView")
///   - params: Additional parameters (optional)
///
/// ## Example
/// ```swift
/// import PhaseAnalytics
///
/// trackScreen("/profile", ["user_id": "123"])
/// ```
public func trackScreen(_ name: String, _ params: [String: Any]? = nil) {
    PhaseSDK.trackScreen(name, params)
}

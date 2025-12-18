import Foundation

internal actor SessionManager {
    private var sessionID: String?
    private var pingTimer: Task<Void, Never>?
    private var isOnline = true
    private var pausedAt: Date?

    private let httpClient: HTTPClient
    private let offlineQueue: OfflineQueue
    private let deviceID: String

    private var startPromise: Task<String, Never>?

    private static let pingInterval: TimeInterval = 5.0
    private static let inactivityTimeout: TimeInterval = 5 * 60

    init(httpClient: HTTPClient, offlineQueue: OfflineQueue, deviceID: String) {
        self.httpClient = httpClient
        self.offlineQueue = offlineQueue
        self.deviceID = deviceID
    }

    func start(isOnline: Bool) async -> String {
        if let promise = startPromise {
            return await promise.value
        }

        if let existingID = sessionID {
            return existingID
        }

        let promise = Task<String, Never> {
            await doStart(isOnline: isOnline)
        }
        startPromise = promise

        let result = await promise.value
        startPromise = nil
        return result
    }

    private func doStart(isOnline: Bool) async -> String {
        stopPingInterval()

        self.isOnline = isOnline
        sessionID = IDGenerator.generateSessionID()

        if case .failure = Validator.validateSessionID(sessionID!) {
            logger.error("Generated session ID invalid, retrying")
            sessionID = IDGenerator.generateSessionID()

            if case .failure = Validator.validateSessionID(sessionID!) {
                logger.error("Failed to generate valid session ID, using UUID fallback")
                sessionID = UUID().uuidString
            }
        }

        let payload = CreateSessionRequest(
            sessionId: sessionID!,
            deviceId: deviceID,
            startedAt: currentISO8601Timestamp()
        )

        if isOnline {
            let result = await httpClient.createSession(payload)
            if case .failure = result {
                logger.error("Failed to create session, queueing")
                await offlineQueue.enqueue(.session(payload: payload, clientOrder: 0, retryCount: nil))
            }
        } else {
            await offlineQueue.enqueue(.session(payload: payload, clientOrder: 0, retryCount: nil))
        }

        startPingInterval()

        return sessionID!
    }

    func pause() {
        pausedAt = Date()
        stopPingInterval()
        logger.debug("Session paused")
    }

    func resume() async {
        guard let pausedAt = pausedAt else {
            startPingInterval()
            return
        }

        let inactiveDuration = Date().timeIntervalSince(pausedAt)

        if inactiveDuration > Self.inactivityTimeout {
            logger.info(
                "Session inactive for \(Int(inactiveDuration)) seconds, starting new session (threshold: \(Int(Self.inactivityTimeout)))"
            )

            sessionID = nil
            self.pausedAt = nil

            _ = await start(isOnline: isOnline)
        } else {
            self.pausedAt = nil
            startPingInterval()
            logger.debug("Session resumed after \(Int(inactiveDuration)) seconds")
        }
    }

    func getSessionID() -> String? {
        return sessionID
    }

    func updateNetworkState(isOnline: Bool) {
        self.isOnline = isOnline
    }

    private func startPingInterval() {
        stopPingInterval()

        pingTimer = Task {
            while !Task.isCancelled {
                try? await Task.sleep(nanoseconds: UInt64(Self.pingInterval * 1_000_000_000))

                if !Task.isCancelled {
                    await sendPing()
                }
            }
        }
    }

    private func stopPingInterval() {
        pingTimer?.cancel()
        pingTimer = nil
    }

    private func sendPing() async {
        guard let sessionID = sessionID else {
            return
        }

        let payload = PingSessionRequest(
            sessionId: sessionID,
            timestamp: currentISO8601Timestamp()
        )

        if isOnline {
            let result = await httpClient.pingSession(payload)
            if case .failure = result {
                logger.error("Failed to ping session, queueing")
                await offlineQueue.enqueue(.ping(payload: payload, clientOrder: 0, retryCount: nil))
            }
        } else {
            await offlineQueue.enqueue(.ping(payload: payload, clientOrder: 0, retryCount: nil))
        }
    }
}

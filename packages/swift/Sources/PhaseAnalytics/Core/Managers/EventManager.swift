import Foundation

internal actor EventManager {
    private var isOnline = true
    private let httpClient: HTTPClient
    private let offlineQueue: OfflineQueue
    private let getSessionID: @Sendable () async -> String?
    private let rateLimiter = RateLimiter()
    private let deduplicator = EventDeduplicator()

    init(
        httpClient: HTTPClient,
        offlineQueue: OfflineQueue,
        getSessionID: @escaping @Sendable () async -> String?
    ) {
        self.httpClient = httpClient
        self.offlineQueue = offlineQueue
        self.getSessionID = getSessionID
    }

    func updateNetworkState(isOnline: Bool) {
        self.isOnline = isOnline
    }

    func track(name: String, params: EventParams?, isScreen: Bool = false) async {
        guard case .success = Validator.validateEventName(name) else {
            logger.error("Invalid event name")
            return
        }

        guard case .success = Validator.validateEventParams(params) else {
            logger.error("Invalid event params")
            return
        }

        guard rateLimiter.canTrack() else {
            return
        }

        guard !deduplicator.isDuplicate(name: name, params: params) else {
            logger.debug("Duplicate event ignored: \(name)")
            return
        }

        guard let sessionID = await getSessionID() else {
            logger.error("Session not started, cannot track event")
            return
        }

        let convertedParams: [String: AnyCodable]?
        if let params = params {
            convertedParams = params.dictionary.mapValues { AnyCodable($0) }
        } else {
            convertedParams = nil
        }

        let payload = CreateEventRequest(
            sessionId: sessionID,
            name: name,
            params: convertedParams,
            isScreen: isScreen,
            timestamp: currentISO8601Timestamp()
        )

        await sendEvent(payload)
    }

    private func sendEvent(_ payload: CreateEventRequest) async {
        if isOnline {
            let result = await httpClient.createEvent(payload)
            if case .failure = result {
                logger.error("Failed to track event, queueing")
                await offlineQueue.enqueue(.event(payload: payload, clientOrder: 0, retryCount: nil))
            }
        } else {
            await offlineQueue.enqueue(.event(payload: payload, clientOrder: 0, retryCount: nil))
        }
    }
}

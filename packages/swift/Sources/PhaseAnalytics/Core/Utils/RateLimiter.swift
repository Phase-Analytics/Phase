import Foundation

internal final class RateLimiter: Sendable {
    private let eventTimestamps: ThreadSafeLock<[Date]>
    private let rateLimitWindow: TimeInterval = 1.0
    private let maxEventsPerSecond = 15

    init() {
        self.eventTimestamps = ThreadSafeLock([])
    }

    func canTrack() -> Bool {
        return eventTimestamps.withLock { timestamps in
            let now = Date()

            let filtered = timestamps.filter { now.timeIntervalSince($0) < rateLimitWindow }

            if filtered.count >= maxEventsPerSecond {
                logger.info("Rate limit exceeded: \(maxEventsPerSecond) events/second. Dropping event.")
                timestamps = filtered
                return false
            }

            var newTimestamps = filtered
            newTimestamps.append(now)
            timestamps = newTimestamps

            return true
        }
    }

    func reset() {
        eventTimestamps.withLock { $0 = [] }
    }
}

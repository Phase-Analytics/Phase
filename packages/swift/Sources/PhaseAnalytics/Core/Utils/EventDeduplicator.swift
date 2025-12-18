import Foundation

internal final class EventDeduplicator: Sendable {
    private let recentEvents: ThreadSafeLock<[String: Date]>
    private let dedupWindow: TimeInterval = 0.05
    private let maxEntriesBeforeCleanup = 100

    init() {
        self.recentEvents = ThreadSafeLock([:])
    }

    func isDuplicate(name: String, params: EventParams?) -> Bool {
        let key = createKey(name: name, params: params)
        let now = Date()

        return recentEvents.withLock { events in
            if let lastTime = events[key], now.timeIntervalSince(lastTime) < dedupWindow {
                logger.debug("Duplicate event detected within \(Int(dedupWindow * 1000))ms window: \(name)")
                return true
            }

            events[key] = now

            if events.count > maxEntriesBeforeCleanup {
                events = events.filter { now.timeIntervalSince($0.value) <= dedupWindow }
            }

            return false
        }
    }

    private func createKey(name: String, params: EventParams?) -> String {
        guard let params = params else {
            return name
        }

        let dict = params.dictionary

        let sortedDict = dict.sorted { $0.key < $1.key }
        if let jsonData = try? JSONSerialization.data(
            withJSONObject: Dictionary(uniqueKeysWithValues: sortedDict),
            options: [.sortedKeys]
        ),
            let jsonString = String(data: jsonData, encoding: .utf8)
        {
            return "\(name):\(jsonString)"
        }

        return name
    }

    func reset() {
        recentEvents.withLock { $0 = [:] }
    }
}

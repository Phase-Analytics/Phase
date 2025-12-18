import Foundation

internal actor OfflineQueue {
    private var queue: [BatchItem] = []
    private var clientOrder = 0
    private let storage: StorageAdapter
    private var initialized = false

    private var operationQueue = Task<Void, Never> {}

    private static let maxQueueSize = 5000

    init(storage: StorageAdapter) {
        self.storage = storage
    }

    func initialize() async {
        let result = await storage.getItem(key: StorageKeys.offlineQueue) as Result<[BatchItem]?, Error>

        if case .success(let items) = result, let items = items, !items.isEmpty {
            queue = items
            let orders = items.map { $0.clientOrder }
            clientOrder = (orders.max() ?? 0) + 1
            logger.debug("Loaded \(items.count) items from offline queue")
        } else if case .failure(let error) = result {
            logger.error("Failed to load offline queue from storage", error)
        }

        initialized = true
    }

    func enqueue(_ item: BatchItem) async {
        guard initialized else {
            logger.error("OfflineQueue not initialized, call initialize() first")
            return
        }

        let previousOp = operationQueue
        operationQueue = Task {
            await previousOp.value

            if queue.count >= Self.maxQueueSize {
                dropOldestSession()
            }

            let isRequeue: Bool

            switch item {
            case .device(_, let order, _),
                .session(_, let order, _),
                .event(_, let order, _),
                .ping(_, let order, _):
                isRequeue = order > 0
            }

            let newItem: BatchItem
            if isRequeue {
                newItem = item
            } else {
                switch item {
                case .device(let payload, _, let retry):
                    newItem = .device(payload: payload, clientOrder: clientOrder, retryCount: retry)
                case .session(let payload, _, let retry):
                    newItem = .session(payload: payload, clientOrder: clientOrder, retryCount: retry)
                case .event(let payload, _, let retry):
                    newItem = .event(payload: payload, clientOrder: clientOrder, retryCount: retry)
                case .ping(let payload, _, let retry):
                    newItem = .ping(payload: payload, clientOrder: clientOrder, retryCount: retry)
                }
                clientOrder += 1
            }

            queue.append(newItem)

            let result = await persist()
            if case .failure = result {
                logger.error("Failed to persist queue after enqueue, data may be lost on crash")
            }
        }

        await operationQueue.value
    }

    func dequeueAll() async -> [BatchItem] {
        let previousOp = operationQueue
        var items: [BatchItem] = []

        operationQueue = Task {
            await previousOp.value

            items = queue
            queue = []
            clientOrder = 0

            let result = await persist()
            if case .failure = result {
                logger.error("Failed to persist empty queue after dequeue")
            }
        }

        await operationQueue.value
        return items
    }

    func clear() async {
        let previousOp = operationQueue

        operationQueue = Task {
            await previousOp.value

            let result = await storage.removeItem(key: StorageKeys.offlineQueue)
            if case .failure = result {
                logger.error("Failed to clear queue from storage")
                return
            }

            queue = []
            clientOrder = 0
        }

        await operationQueue.value
    }

    func getSize() -> Int {
        return queue.count
    }

    private func dropOldestSession() {
        let sessionItems = queue.filter { item in
            if case .session = item { return true }
            return false
        }

        guard !sessionItems.isEmpty else {
            if !queue.isEmpty {
                queue.removeFirst()
                logger.debug("Queue full (\(Self.maxQueueSize)), no sessions to drop, dropping oldest item")
            }
            return
        }

        guard
            let oldestSession = sessionItems.min(by: {
                $0.clientOrder < $1.clientOrder
            })
        else { return }

        let oldestSessionId: String
        if case .session(let payload, _, _) = oldestSession {
            oldestSessionId = payload.sessionId
        } else {
            return
        }

        let initialLength = queue.count
        queue = queue.filter { item in
            if case .device = item { return true }

            if case .session(let payload, _, _) = item {
                return payload.sessionId != oldestSessionId
            }

            if case .event(let payload, _, _) = item {
                return payload.sessionId != oldestSessionId
            }

            if case .ping(let payload, _, _) = item {
                return payload.sessionId != oldestSessionId
            }

            return true
        }

        let droppedCount = initialLength - queue.count
        logger.debug("Queue full (\(Self.maxQueueSize)), dropped oldest session and \(droppedCount) related items")
    }

    private func persist() async -> Result<Void, Error> {
        return await storage.setItem(key: StorageKeys.offlineQueue, value: queue)
    }
}

import Foundation

internal actor BatchSender {
    private let httpClient: HTTPClient
    private let offlineQueue: OfflineQueue
    private var isFlushing = false

    private static let maxRetryCount = 5

    init(httpClient: HTTPClient, offlineQueue: OfflineQueue) {
        self.httpClient = httpClient
        self.offlineQueue = offlineQueue
    }

    func flush() async {
        guard !isFlushing else {
            logger.debug("Flush already in progress, skipping")
            return
        }

        isFlushing = true
        defer { isFlushing = false }

        let items = await offlineQueue.dequeueAll()
        guard !items.isEmpty else {
            return
        }

        let batches = splitIntoBatches(items)
        logger.debug("Flushing \(items.count) items in \(batches.count) batches")

        for batch in batches {
            let result = await sendBatch(batch)

            if case .failure = result {
                logger.error("Failed to send batch, re-queueing")
                await requeue(batch)
            }
        }
    }

    private func sendBatch(_ items: [BatchItem]) async -> Result<BatchResponse, PhaseError> {
        let request = BatchRequest(items: items)
        let result = await httpClient.sendBatch(request)

        if case .success(let response) = result {
            if response.failed > 0 {
                let total = (response.processed ?? 0) + response.failed
                logger.error("Batch partially failed: \(response.failed)/\(total)")

                var failedItems: [BatchItem] = []

                for error in response.errors {
                    guard let clientOrder = error.clientOrder else {
                        logger.error("Error missing clientOrder, cannot re-enqueue")
                        continue
                    }

                    if let failedItem = items.first(where: { $0.clientOrder == clientOrder }) {
                        failedItems.append(failedItem)
                    }
                }

                if !failedItems.isEmpty {
                    await requeue(failedItems)
                }
            }
        }

        return result
    }

    private func requeue(_ items: [BatchItem]) async {
        await withTaskGroup(of: Void.self) { group in
            for item in items {
                group.addTask {
                    let retryCount = (item.retryCount ?? 0) + 1

                    guard retryCount <= Self.maxRetryCount else {
                        logger.error("Item exceeded max retry count (\(Self.maxRetryCount)), dropping")
                        return
                    }

                    let newItem: BatchItem
                    switch item {
                    case .device(let payload, let order, _):
                        newItem = .device(payload: payload, clientOrder: order, retryCount: retryCount)
                    case .session(let payload, let order, _):
                        newItem = .session(payload: payload, clientOrder: order, retryCount: retryCount)
                    case .event(let payload, let order, _):
                        newItem = .event(payload: payload, clientOrder: order, retryCount: retryCount)
                    case .ping(let payload, let order, _):
                        newItem = .ping(payload: payload, clientOrder: order, retryCount: retryCount)
                    }

                    await self.offlineQueue.enqueue(newItem)
                }
            }
        }
    }

    private func splitIntoBatches(_ items: [BatchItem]) -> [[BatchItem]] {
        let maxSize = ValidationConstants.Batch.maxSize
        var batches: [[BatchItem]] = []

        for i in stride(from: 0, to: items.count, by: maxSize) {
            let endIndex = min(i + maxSize, items.count)
            batches.append(Array(items[i..<endIndex]))
        }

        return batches
    }
}

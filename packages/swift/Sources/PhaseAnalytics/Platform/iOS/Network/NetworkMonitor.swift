import Foundation
import Network

internal final class NetworkMonitor: NetworkAdapter {
    private let monitor = NWPathMonitor()
    private let queue = DispatchQueue(label: "com.phase.network-monitor")
    private let listeners = ThreadSafeLock<[(UUID, NetworkStateListener)]>([])

    init() {
        setupPathHandler()
        monitor.start(queue: queue)
    }

    deinit {
        monitor.cancel()
    }

    private func setupPathHandler() {
        monitor.pathUpdateHandler = { [weak self] path in
            let state = NetworkState(isConnected: path.status == .satisfied)

            let listenersCopy = self?.listeners.withLock { Array($0) } ?? []

            for (_, listenerFn) in listenersCopy {
                listenerFn(state)
            }
        }
    }

    func fetchNetworkState() async -> NetworkState {
        await withCheckedContinuation { continuation in
            queue.async {
                let isConnected = self.monitor.currentPath.status == .satisfied
                continuation.resume(returning: NetworkState(isConnected: isConnected))
            }
        }
    }

    func addNetworkListener(_ listener: @escaping NetworkStateListener) -> UnsubscribeFn {
        let id = UUID()

        listeners.withLock { $0.append((id, listener)) }

        return { [weak self] in
            self?.listeners.withLock { listeners in
                listeners.removeAll { $0.0 == id }
            }
        }
    }
}

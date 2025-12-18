import Foundation

public typealias NetworkStateListener = @Sendable (NetworkState) -> Void
public typealias UnsubscribeFn = @Sendable () -> Void

public protocol NetworkAdapter: Sendable {
    func fetchNetworkState() async -> NetworkState
    func addNetworkListener(_ listener: @escaping NetworkStateListener) -> UnsubscribeFn
}

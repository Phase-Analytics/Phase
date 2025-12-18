import Foundation

internal final class ThreadSafeLock<Value>: @unchecked Sendable {
    private let lock = NSLock()
    private var value: Value

    init(_ initialValue: Value) {
        self.value = initialValue
    }

    func withLock<Result>(_ body: (inout Value) -> Result) -> Result {
        lock.lock()
        defer { lock.unlock() }
        return body(&value)
    }
}

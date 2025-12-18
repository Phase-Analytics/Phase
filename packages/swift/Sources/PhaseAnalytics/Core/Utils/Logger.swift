import Foundation

internal final class Logger: Sendable {
    private let levelValue: ThreadSafeLock<Int>

    private let levels: [LogLevel: Int] = [
        .debug: 0,
        .info: 1,
        .error: 2,
        .none: 3,
    ]

    init() {
        self.levelValue = ThreadSafeLock(2)
    }

    func setLogLevel(_ level: LogLevel) {
        levelValue.withLock { $0 = levels[level] ?? 2 }
    }

    func debug(_ message: String) {
        levelValue.withLock { currentLevel in
            guard currentLevel <= (levels[.debug] ?? 0) else { return }
            print("[Phase SDK] \(message)")
        }
    }

    func info(_ message: String) {
        levelValue.withLock { currentLevel in
            guard currentLevel <= (levels[.info] ?? 1) else { return }
            print("[Phase SDK] \(message)")
        }
    }

    func error(_ message: String, _ error: Error? = nil) {
        levelValue.withLock { currentLevel in
            guard currentLevel <= (levels[.error] ?? 2) else { return }
            if let error = error {
                print("[Phase SDK Error] \(message): \(error.localizedDescription)")
            } else {
                print("[Phase SDK Error] \(message)")
            }
        }
    }
}

internal let logger = Logger()

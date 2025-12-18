import Foundation
import ULID

internal struct IDGenerator {
    static func generateDeviceID() -> String {
        return ULID().ulidString
    }

    static func generateSessionID() -> String {
        return ULID().ulidString
    }
}

internal func currentISO8601Timestamp() -> String {
    let formatter = ISO8601DateFormatter()
    formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    return formatter.string(from: Date())
}

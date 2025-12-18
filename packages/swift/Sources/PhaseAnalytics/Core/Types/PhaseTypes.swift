import Foundation

/// Device platform (auto-detected)
public enum Platform: String, Codable, Sendable {
    case ios
    case android
}

/// Device form factor (auto-detected)
public enum DeviceType: String, Codable, Sendable {
    /// iPhone or Android phone
    case phone
    /// iPad or Android tablet
    case tablet
    /// Mac or desktop device
    case desktop
}

/// Logging verbosity level
///
/// - `debug`: All logs including internal SDK operations
/// - `info`: Initialization and important events only
/// - `error`: Only errors
/// - `none`: Silent mode (recommended for production)
public enum LogLevel: String, Sendable {
    case debug
    case info
    case error
    case none
}

/// Configuration options for Phase SDK initialization
public struct PhaseConfig: Sendable {
    /// Your Phase API key (required, starts with "phase_")
    /// - Example: `"phase_xxx"`
    public let apiKey: String

    /// Custom API endpoint for self-hosting
    /// - Default: `"https://api.phase.sh"`
    public var baseURL: String

    /// Logging verbosity level
    /// - Default: `.none`
    public var logLevel: LogLevel

    /// Collect device metadata (type, OS version, platform)
    /// - Default: `true`
    public var deviceInfo: Bool

    /// Collect user locale and enable server-side geolocation
    /// - Default: `true`
    public var userLocale: Bool

    public init(
        apiKey: String,
        baseURL: String = "https://api.phase.sh",
        logLevel: LogLevel = .none,
        deviceInfo: Bool = true,
        userLocale: Bool = true
    ) {
        self.apiKey = apiKey
        self.baseURL = baseURL
        self.logLevel = logLevel
        self.deviceInfo = deviceInfo
        self.userLocale = userLocale
    }
}

public struct DeviceInfo: Sendable {
    public let deviceType: DeviceType?
    public let osVersion: String?
    public let platform: Platform?
    public let locale: String?

    public init(
        deviceType: DeviceType?,
        osVersion: String?,
        platform: Platform?,
        locale: String?
    ) {
        self.deviceType = deviceType
        self.osVersion = osVersion
        self.platform = platform
        self.locale = locale
    }
}

/// Event parameters for tracking custom data
///
/// Supports nested objects up to 6 levels deep and max 50KB size.
///
/// ## Example
/// ```swift
/// track("purchase", ["amount": 99.99, "currency": "USD"])
///
/// // Or with EventParams directly:
/// let params: EventParams = ["item_id": "abc", "quantity": 2]
/// PhaseSDK.shared.track("add_to_cart", params: params)
/// ```
public struct EventParams: @unchecked Sendable {
    private let dict: [String: Any]

    public init(_ dict: [String: Any]) {
        self.dict = dict
    }

    public var dictionary: [String: Any] { dict }
}

extension EventParams: ExpressibleByDictionaryLiteral {
    public init(dictionaryLiteral elements: (String, Any)...) {
        var dict: [String: Any] = [:]
        for (key, value) in elements {
            dict[key] = value
        }
        self.init(dict)
    }
}

public struct CreateDeviceRequest: Codable, Sendable {
    let deviceId: String
    let deviceType: DeviceType?
    let osVersion: String?
    let platform: Platform?
    let locale: String?
    let disableGeolocation: Bool?
}

public struct CreateSessionRequest: Codable, Sendable {
    let sessionId: String
    let deviceId: String
    let startedAt: String
}

public struct CreateEventRequest: Codable, Sendable {
    let sessionId: String
    let name: String
    let params: [String: AnyCodable]?
    let isScreen: Bool
    let timestamp: String
}

public struct PingSessionRequest: Codable, Sendable {
    let sessionId: String
    let timestamp: String
}

public struct DeviceResponse: Codable, Sendable {
    let deviceId: String
    let deviceType: DeviceType?
    let osVersion: String?
    let platform: Platform?
    let locale: String?
    let country: String?
    let city: String?
    let firstSeen: String
}

public struct SessionResponse: Codable, Sendable {
    let sessionId: String
    let deviceId: String
    let startedAt: String
    let lastActivityAt: String
}

public struct EventResponse: Codable, Sendable {
    let eventId: String
    let sessionId: String
    let deviceId: String
    let name: String
    let params: [String: AnyCodable]?
    let isScreen: Bool
    let timestamp: String
}

public struct PingSessionResponse: Codable, Sendable {
    let sessionId: String
    let lastActivityAt: String
}

public enum BatchItem: Sendable {
    case device(payload: CreateDeviceRequest, clientOrder: Int, retryCount: Int?)
    case session(payload: CreateSessionRequest, clientOrder: Int, retryCount: Int?)
    case event(payload: CreateEventRequest, clientOrder: Int, retryCount: Int?)
    case ping(payload: PingSessionRequest, clientOrder: Int, retryCount: Int?)

    var clientOrder: Int {
        switch self {
        case .device(_, let order, _): return order
        case .session(_, let order, _): return order
        case .event(_, let order, _): return order
        case .ping(_, let order, _): return order
        }
    }

    var retryCount: Int? {
        switch self {
        case .device(_, _, let retry): return retry
        case .session(_, _, let retry): return retry
        case .event(_, _, let retry): return retry
        case .ping(_, _, let retry): return retry
        }
    }

    var type: String {
        switch self {
        case .device: return "device"
        case .session: return "session"
        case .event: return "event"
        case .ping: return "ping"
        }
    }
}

extension BatchItem: Codable {
    private enum CodingKeys: String, CodingKey {
        case type, payload, clientOrder, retryCount
    }

    public init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        let type = try container.decode(String.self, forKey: .type)
        let clientOrder = try container.decode(Int.self, forKey: .clientOrder)
        let retryCount = try container.decodeIfPresent(Int.self, forKey: .retryCount)

        switch type {
        case "device":
            let payload = try container.decode(CreateDeviceRequest.self, forKey: .payload)
            self = .device(payload: payload, clientOrder: clientOrder, retryCount: retryCount)
        case "session":
            let payload = try container.decode(CreateSessionRequest.self, forKey: .payload)
            self = .session(payload: payload, clientOrder: clientOrder, retryCount: retryCount)
        case "event":
            let payload = try container.decode(CreateEventRequest.self, forKey: .payload)
            self = .event(payload: payload, clientOrder: clientOrder, retryCount: retryCount)
        case "ping":
            let payload = try container.decode(PingSessionRequest.self, forKey: .payload)
            self = .ping(payload: payload, clientOrder: clientOrder, retryCount: retryCount)
        default:
            throw DecodingError.dataCorruptedError(
                forKey: .type,
                in: container,
                debugDescription: "Unknown batch item type: \(type)"
            )
        }
    }

    public func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)

        switch self {
        case .device(let payload, let clientOrder, let retryCount):
            try container.encode("device", forKey: .type)
            try container.encode(payload, forKey: .payload)
            try container.encode(clientOrder, forKey: .clientOrder)
            try container.encodeIfPresent(retryCount, forKey: .retryCount)
        case .session(let payload, let clientOrder, let retryCount):
            try container.encode("session", forKey: .type)
            try container.encode(payload, forKey: .payload)
            try container.encode(clientOrder, forKey: .clientOrder)
            try container.encodeIfPresent(retryCount, forKey: .retryCount)
        case .event(let payload, let clientOrder, let retryCount):
            try container.encode("event", forKey: .type)
            try container.encode(payload, forKey: .payload)
            try container.encode(clientOrder, forKey: .clientOrder)
            try container.encodeIfPresent(retryCount, forKey: .retryCount)
        case .ping(let payload, let clientOrder, let retryCount):
            try container.encode("ping", forKey: .type)
            try container.encode(payload, forKey: .payload)
            try container.encode(clientOrder, forKey: .clientOrder)
            try container.encodeIfPresent(retryCount, forKey: .retryCount)
        }
    }
}

public struct BatchRequest: Codable, Sendable {
    let items: [BatchItem]
}

public struct BatchError: Codable, Sendable {
    let clientOrder: Int?
    let code: String
    let detail: String
}

public struct BatchResultItem: Codable, Sendable {
    let clientOrder: Int
    let type: String
    let id: String
}

public struct BatchResponse: Codable, Sendable {
    let processed: Int?
    let failed: Int
    let errors: [BatchError]
    let results: [BatchResultItem]
}

public struct NetworkState: Sendable {
    public let isConnected: Bool

    public init(isConnected: Bool) {
        self.isConnected = isConnected
    }
}

internal struct StorageKeys {
    static let deviceID = "phase-analytics/device-id"
    static let deviceInfo = "phase-analytics/device-info"
    static let offlineQueue = "phase-analytics/offline-queue"
}

public struct AnyCodable: Codable, @unchecked Sendable {
    public let value: Any

    public init(_ value: Any) {
        self.value = value
    }

    public init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()

        if let bool = try? container.decode(Bool.self) {
            value = bool
        } else if let double = try? container.decode(Double.self) {
            if double.truncatingRemainder(dividingBy: 1) == 0,
                let int = Int(exactly: double)
            {
                value = int
            } else {
                value = double
            }
        } else if let string = try? container.decode(String.self) {
            value = string
        } else if let array = try? container.decode([AnyCodable].self) {
            value = array.map { $0.value }
        } else if let dict = try? container.decode([String: AnyCodable].self) {
            value = dict.mapValues { $0.value }
        } else {
            value = NSNull()
        }
    }

    public func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()

        switch value {
        case let bool as Bool:
            try container.encode(bool)
        case let int as Int:
            try container.encode(int)
        case let double as Double:
            try container.encode(double)
        case let string as String:
            try container.encode(string)
        case let array as [Any]:
            try container.encode(array.map { AnyCodable($0) })
        case let dict as [String: Any]:
            try container.encode(dict.mapValues { AnyCodable($0) })
        default:
            try container.encodeNil()
        }
    }
}

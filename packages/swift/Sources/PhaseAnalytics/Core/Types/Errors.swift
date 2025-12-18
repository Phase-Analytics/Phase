import Foundation

/// Errors that can occur during Phase SDK operations
///
/// ## Common Errors
/// - `invalidAPIKey`: API key is missing or doesn't start with "phase_"
/// - `notInitialized`: SDK methods called before `initialize()`
/// - `validationFailed`: Event name or params don't meet requirements
public enum PhaseError: Error, Sendable {
    /// API key is missing or invalid format (must start with "phase_")
    case invalidAPIKey
    /// SDK not initialized - call `initialize()` first
    case notInitialized
    /// Validation failed (event name, params, etc.)
    case validationFailed(String)
    /// Network request failed
    case networkError(String)
    /// HTTP error response from server
    case httpError(statusCode: Int, message: String)
    /// Failed to read/write from storage
    case storageError(String)
    /// Failed to encode request data
    case encodingError
    /// Failed to decode response data
    case decodingError

    public var localizedDescription: String {
        switch self {
        case .invalidAPIKey:
            return "Invalid API key format. API key must start with 'phase_'"
        case .notInitialized:
            return "SDK not initialized. Call initialize() first."
        case .validationFailed(let message):
            return "Validation failed: \(message)"
        case .networkError(let message):
            return "Network error: \(message)"
        case .httpError(let statusCode, let message):
            return "HTTP error (\(statusCode)): \(message)"
        case .storageError(let message):
            return "Storage error: \(message)"
        case .encodingError:
            return "Failed to encode data"
        case .decodingError:
            return "Failed to decode data"
        }
    }
}

public final class HTTPError: Error, Sendable {
    public let statusCode: Int
    public let message: String

    public init(statusCode: Int, message: String) {
        self.statusCode = statusCode
        self.message = message
    }

    public func isRetryable() -> Bool {
        return statusCode >= 500 && statusCode < 600
    }
}

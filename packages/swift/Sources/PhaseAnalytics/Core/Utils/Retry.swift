import Foundation

internal struct Retry {
    private static let retryDelays: [TimeInterval] = [0.1, 0.5, 2.0]

    static func withRetry<T: Sendable>(
        _ operation: @Sendable @escaping () async throws -> T
    ) async -> Result<T, PhaseError> {
        var lastError: Error?

        for (attempt, delay) in ([0.0] + retryDelays).enumerated() {
            if Task.isCancelled {
                return .failure(.networkError("Request cancelled"))
            }

            if attempt > 0 {
                do {
                    try await Task.sleep(nanoseconds: UInt64(delay * 1_000_000_000))
                } catch is CancellationError {
                    return .failure(.networkError("Request cancelled"))
                } catch {
                    // Ignore other sleep errors
                }
            }

            do {
                let result = try await operation()
                return .success(result)
            } catch let error as HTTPError {
                lastError = error
                if !error.isRetryable() {
                    break
                }
            } catch is CancellationError {
                return .failure(.networkError("Request cancelled"))
            } catch {
                lastError = error
                break
            }
        }

        let errorMessage = lastError?.localizedDescription ?? "Unknown network error"
        return .failure(.networkError(errorMessage))
    }
}

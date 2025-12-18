import Foundation
import Gzip

internal final class HTTPClient: Sendable {
    private let apiKey: String
    private let baseURL: String
    private let session: URLSession

    private static let batchCompressionThreshold = 100
    private static let requestTimeoutSeconds: TimeInterval = 30
    private static let maxErrorLength = 500

    init(apiKey: String, baseURL: String = "https://api.phase.sh") {
        self.apiKey = apiKey
        self.baseURL = baseURL

        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = Self.requestTimeoutSeconds
        config.timeoutIntervalForResource = Self.requestTimeoutSeconds
        self.session = URLSession(configuration: config)
    }

    private func makeEncoder() -> JSONEncoder {
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        encoder.outputFormatting = [.sortedKeys]
        return encoder
    }

    private func makeDecoder() -> JSONDecoder {
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        return decoder
    }

    func createDevice(_ payload: CreateDeviceRequest) async -> Result<DeviceResponse, PhaseError> {
        await request(endpoint: "/sdk/devices", body: payload, operationName: "CreateDevice")
    }

    func createSession(_ payload: CreateSessionRequest) async -> Result<SessionResponse, PhaseError> {
        await request(endpoint: "/sdk/sessions", body: payload, operationName: "CreateSession")
    }

    func createEvent(_ payload: CreateEventRequest) async -> Result<EventResponse, PhaseError> {
        await request(endpoint: "/sdk/events", body: payload, operationName: "CreateEvent")
    }

    func pingSession(_ payload: PingSessionRequest) async -> Result<PingSessionResponse, PhaseError> {
        await request(endpoint: "/sdk/ping", body: payload, operationName: "PingSession")
    }

    func sendBatch(_ payload: BatchRequest) async -> Result<BatchResponse, PhaseError> {
        let shouldCompress = payload.items.count >= Self.batchCompressionThreshold

        if shouldCompress {
            return await requestCompressed(endpoint: "/sdk/batch", body: payload, operationName: "SendBatch")
        }

        return await request(endpoint: "/sdk/batch", body: payload, operationName: "SendBatch")
    }

    private func request<T: Codable & Sendable, U: Codable & Sendable>(
        endpoint: String,
        body: T,
        operationName: String,
        retryEnabled: Bool = true
    ) async -> Result<U, PhaseError> {
        let jsonData: Data
        do {
            jsonData = try makeEncoder().encode(body)
        } catch {
            return .failure(.encodingError)
        }

        logger.debug("\(operationName): \(endpoint) (\(jsonData.count) bytes)")

        guard let url = URL(string: baseURL + endpoint) else {
            return .failure(.networkError("Invalid URL: \(baseURL + endpoint)"))
        }

        var urlRequest = URLRequest(url: url)
        urlRequest.httpMethod = "POST"
        urlRequest.setValue("application/json", forHTTPHeaderField: "Content-Type")
        urlRequest.setValue("Bearer \(apiKey)", forHTTPHeaderField: "Authorization")
        urlRequest.httpBody = jsonData

        if retryEnabled {
            return await executeWithRetry(urlRequest: urlRequest, operationName: operationName)
        }

        return await executeSingle(urlRequest: urlRequest, operationName: operationName)
    }

    private func executeSingle<U: Codable & Sendable>(
        urlRequest: URLRequest,
        operationName: String
    ) async -> Result<U, PhaseError> {
        do {
            let (data, response) = try await session.data(for: urlRequest)

            guard let httpResponse = response as? HTTPURLResponse else {
                return .failure(.networkError("Invalid server response"))
            }

            guard httpResponse.statusCode == 200 else {
                let errorMessage = String(data: data, encoding: .utf8) ?? "Unknown error"
                let sanitized = sanitizeError(errorMessage)
                logger.error("\(operationName): HTTP \(httpResponse.statusCode)")
                return .failure(.httpError(statusCode: httpResponse.statusCode, message: sanitized))
            }

            guard !data.isEmpty else {
                logger.error("\(operationName): Server returned empty response body")
                return .failure(
                    .httpError(
                        statusCode: httpResponse.statusCode,
                        message: "Server returned empty response body"
                    ))
            }

            let result = try makeDecoder().decode(U.self, from: data)
            return .success(result)

        } catch let error as PhaseError {
            return .failure(error)
        } catch {
            logger.error("\(operationName): Failed", error)
            return .failure(.networkError(error.localizedDescription))
        }
    }

    private func executeWithRetry<U: Codable & Sendable>(
        urlRequest: URLRequest,
        operationName: String
    ) async -> Result<U, PhaseError> {
        let retryDelays: [TimeInterval] = [0.1, 0.5, 2.0]
        var lastError: Error?

        for (attempt, delay) in ([0.0] + retryDelays).enumerated() {
            if Task.isCancelled {
                return .failure(.networkError("Request cancelled"))
            }

            if attempt > 0 {
                do {
                    try await Task.sleep(nanoseconds: UInt64(delay * 1_000_000_000))
                } catch {
                    return .failure(.networkError("Request cancelled"))
                }
            }

            do {
                let (data, response) = try await session.data(for: urlRequest)

                guard let httpResponse = response as? HTTPURLResponse else {
                    throw URLError(.badServerResponse)
                }

                guard httpResponse.statusCode == 200 else {
                    let errorMessage = String(data: data, encoding: .utf8) ?? "Unknown error"
                    let sanitized = sanitizeError(errorMessage)
                    throw HTTPError(statusCode: httpResponse.statusCode, message: sanitized)
                }

                guard !data.isEmpty else {
                    throw HTTPError(
                        statusCode: httpResponse.statusCode,
                        message: "Server returned empty response body"
                    )
                }

                let result = try makeDecoder().decode(U.self, from: data)
                return .success(result)

            } catch let error as HTTPError {
                lastError = error
                if !error.isRetryable() {
                    logger.error("\(operationName): HTTP \(error.statusCode) (not retryable)")
                    return .failure(.httpError(statusCode: error.statusCode, message: error.message))
                }
                logger.debug("\(operationName): Attempt \(attempt + 1) failed, will retry")
            } catch is CancellationError {
                return .failure(.networkError("Request cancelled"))
            } catch {
                lastError = error
                logger.debug("\(operationName): Attempt \(attempt + 1) failed, will retry")
            }
        }

        logger.error("\(operationName): Failed after \(retryDelays.count + 1) attempts")
        let errorMessage = lastError?.localizedDescription ?? "Unknown network error"
        return .failure(.networkError(errorMessage))
    }

    private func requestCompressed<T: Codable & Sendable, U: Codable & Sendable>(
        endpoint: String,
        body: T,
        operationName: String,
        retryEnabled: Bool = true
    ) async -> Result<U, PhaseError> {
        let jsonData: Data
        do {
            jsonData = try makeEncoder().encode(body)
        } catch {
            return .failure(.encodingError)
        }

        guard let compressed = try? jsonData.gzipped() else {
            logger.error("\(operationName): Failed to compress data")
            return .failure(.encodingError)
        }

        logger.debug("\(operationName): \(endpoint) compressed (\(jsonData.count) → \(compressed.count) bytes)")

        guard let url = URL(string: baseURL + endpoint) else {
            return .failure(.networkError("Invalid URL: \(baseURL + endpoint)"))
        }

        var urlRequest = URLRequest(url: url)
        urlRequest.httpMethod = "POST"
        urlRequest.setValue("application/json", forHTTPHeaderField: "Content-Type")
        urlRequest.setValue("gzip", forHTTPHeaderField: "Content-Encoding")
        urlRequest.setValue("Bearer \(apiKey)", forHTTPHeaderField: "Authorization")
        urlRequest.httpBody = compressed

        if retryEnabled {
            return await executeWithRetry(urlRequest: urlRequest, operationName: operationName)
        }

        return await executeSingle(urlRequest: urlRequest, operationName: operationName)
    }

    private func sanitizeError(_ errorText: String) -> String {
        if errorText.count > Self.maxErrorLength {
            return String(errorText.prefix(Self.maxErrorLength)) + "... (truncated)"
        }
        return errorText
    }
}

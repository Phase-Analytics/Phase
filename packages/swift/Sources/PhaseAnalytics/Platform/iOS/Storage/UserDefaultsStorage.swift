import Foundation

internal final class UserDefaultsStorage: StorageAdapter, @unchecked Sendable {
    private let userDefaults: UserDefaults

    init(userDefaults: UserDefaults = .standard) {
        self.userDefaults = userDefaults
    }

    private func makeEncoder() -> JSONEncoder {
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        return encoder
    }

    private func makeDecoder() -> JSONDecoder {
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        return decoder
    }

    func getItem<T: Codable & Sendable>(key: String) async -> Result<T?, Error> {
        guard let data = userDefaults.data(forKey: key) else {
            return .success(nil)
        }

        do {
            let value = try makeDecoder().decode(T.self, from: data)
            return .success(value)
        } catch {
            logger.error("Failed to decode item for key: \(key), clearing corrupted data", error)
            userDefaults.removeObject(forKey: key)
            return .success(nil)
        }
    }

    func setItem<T: Codable & Sendable>(key: String, value: T) async -> Result<Void, Error> {
        do {
            let data = try makeEncoder().encode(value)
            userDefaults.set(data, forKey: key)
            return .success(())
        } catch {
            logger.error("Failed to encode item for key: \(key)", error)
            return .failure(error)
        }
    }

    func removeItem(key: String) async -> Result<Void, Error> {
        userDefaults.removeObject(forKey: key)
        return .success(())
    }

    func clear() async -> Result<Void, Error> {
        let phaseKeys = [
            StorageKeys.deviceID,
            StorageKeys.deviceInfo,
            StorageKeys.offlineQueue,
        ]

        for key in phaseKeys {
            userDefaults.removeObject(forKey: key)
        }

        return .success(())
    }
}

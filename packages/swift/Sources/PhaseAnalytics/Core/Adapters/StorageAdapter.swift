import Foundation

public protocol StorageAdapter: Sendable {
    func getItem<T: Codable & Sendable>(key: String) async -> Result<T?, Error>
    func setItem<T: Codable & Sendable>(key: String, value: T) async -> Result<Void, Error>
    func removeItem(key: String) async -> Result<Void, Error>
    func clear() async -> Result<Void, Error>
}

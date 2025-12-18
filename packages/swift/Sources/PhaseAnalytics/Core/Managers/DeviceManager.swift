import Foundation

internal actor DeviceManager {
    private var deviceID: String?
    private let httpClient: HTTPClient
    private let offlineQueue: OfflineQueue
    private let storage: StorageAdapter
    private let getDeviceInfo: @Sendable () -> DeviceInfo
    private let collectDeviceInfo: Bool
    private let collectLocale: Bool

    private var initPromise: Task<String, Never>?

    init(
        httpClient: HTTPClient,
        offlineQueue: OfflineQueue,
        storage: StorageAdapter,
        getDeviceInfo: @escaping @Sendable () -> DeviceInfo,
        config: PhaseConfig
    ) {
        self.httpClient = httpClient
        self.offlineQueue = offlineQueue
        self.storage = storage
        self.getDeviceInfo = getDeviceInfo
        self.collectDeviceInfo = config.deviceInfo
        self.collectLocale = config.userLocale
    }

    func initialize(isOnline: Bool) async -> String {
        if let promise = initPromise {
            return await promise.value
        }

        if let existingID = deviceID {
            return existingID
        }

        let promise = Task<String, Never> {
            await doInitialize(isOnline: isOnline)
        }
        initPromise = promise

        let result = await promise.value
        initPromise = nil
        return result
    }

    private func doInitialize(isOnline: Bool) async -> String {
        let result = await storage.getItem(key: StorageKeys.deviceID) as Result<String?, Error>

        if case .success(let stored) = result,
            let stored = stored,
            case .success = Validator.validateDeviceID(stored)
        {
            deviceID = stored
            logger.debug("Loaded existing device ID from storage")
        } else {
            deviceID = IDGenerator.generateDeviceID()
            logger.debug("Generated new device ID")

            let saveResult = await storage.setItem(key: StorageKeys.deviceID, value: deviceID!)
            if case .failure(let error) = saveResult {
                logger.error("Failed to persist device ID", error)
            }
        }

        let shouldUpdate = await shouldUpdateDevice()
        if shouldUpdate {
            await registerDevice(isOnline: isOnline)
        } else {
            logger.debug("Device info unchanged, skipping device POST")
        }

        return deviceID!
    }

    private func shouldUpdateDevice() async -> Bool {
        guard let current = buildDevicePayload() else {
            logger.error("Device ID not set, cannot check for updates")
            return false
        }

        let result = await storage.getItem(key: StorageKeys.deviceInfo) as Result<CreateDeviceRequest?, Error>

        if case .success(let cached) = result, let cached = cached {
            let hasChanged =
                cached.deviceType != current.deviceType || cached.osVersion != current.osVersion
                || cached.platform != current.platform || cached.locale != current.locale
                || cached.disableGeolocation != current.disableGeolocation

            if hasChanged {
                logger.debug("Device info changed, will register device")
            }

            return hasChanged
        }

        logger.debug("No cached device info, will register device")
        return true
    }

    private func registerDevice(isOnline: Bool) async {
        guard let payload = buildDevicePayload() else {
            logger.error("Device ID not set, cannot register device")
            return
        }

        if isOnline {
            let result = await httpClient.createDevice(payload)

            if case .success = result {
                await cacheDeviceInfo(payload)
            } else {
                logger.error("Failed to register device, queueing")
                await offlineQueue.enqueue(.device(payload: payload, clientOrder: 0, retryCount: nil))
                await cacheDeviceInfo(payload)
            }
        } else {
            await offlineQueue.enqueue(.device(payload: payload, clientOrder: 0, retryCount: nil))
            await cacheDeviceInfo(payload)
        }
    }

    private func cacheDeviceInfo(_ payload: CreateDeviceRequest) async {
        let result = await storage.setItem(key: StorageKeys.deviceInfo, value: payload)
        if case .success = result {
            logger.debug("Device info cached successfully")
        } else if case .failure(let error) = result {
            logger.error("Failed to cache device info", error)
        }
    }

    private func buildDevicePayload() -> CreateDeviceRequest? {
        guard let deviceID = deviceID else { return nil }

        let info = getDeviceInfo()
        return CreateDeviceRequest(
            deviceId: deviceID,
            deviceType: collectDeviceInfo ? info.deviceType : nil,
            osVersion: collectDeviceInfo ? info.osVersion : nil,
            platform: collectDeviceInfo ? info.platform : nil,
            locale: collectLocale ? info.locale : nil,
            disableGeolocation: !collectLocale
        )
    }
}

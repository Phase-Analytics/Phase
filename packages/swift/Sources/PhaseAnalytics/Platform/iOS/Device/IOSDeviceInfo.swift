import Foundation

#if canImport(UIKit)
    import UIKit

    public func getIOSDeviceInfo() -> DeviceInfo {
        let model = getModel()
        let fallbackModel = !model.isEmpty ? model : getDeviceType()?.rawValue

        return DeviceInfo(
            osVersion: getOSVersion(),
            platform: .ios,
            locale: getLocale(),
            model: fallbackModel
        )
    }

    private func getDeviceType() -> DeviceType? {
        let idiom = UIDevice.current.userInterfaceIdiom

        switch idiom {
        case .phone:
            return .phone
        case .pad:
            return .tablet
        case .mac:
            return .desktop
        default:
            return nil
        }
    }

    private func getOSVersion() -> String {
        return UIDevice.current.systemVersion
    }

    private func getLocale() -> String {
        return Locale.current.identifier
    }

    private func getModel() -> String {
        return UIDevice.current.model
    }
#endif

import Foundation
import UIKit

public func getIOSDeviceInfo() -> DeviceInfo {
    return DeviceInfo(
        deviceType: getDeviceType(),
        osVersion: getOSVersion(),
        platform: .ios,
        locale: getLocale()
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

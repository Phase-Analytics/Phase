import Foundation

public struct ValidationConstants {
    public struct DeviceID {
        public static let minLength = 8
        public static let maxLength = 128
        public static let pattern = #"^[\w-]+$"#
    }

    public struct SessionID {
        public static let minLength = 8
        public static let maxLength = 128
        public static let pattern = #"^[\w-]+$"#
    }

    public struct EventName {
        public static let minLength = 1
        public static let maxLength = 256
        public static let pattern = #"^[\w./-]+$"#
    }

    public struct EventParams {
        public static let maxSize = 50_000
        public static let maxDepth = 6
    }

    public struct Batch {
        public static let maxSize = 5000
    }

    public struct Version {
        public static let osVersionMaxLength = 64
    }

    public struct Locale {
        public static let maxLength = 10
    }
}

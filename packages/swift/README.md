# Phase Analytics SDK for Swift

Privacy-first analytics for iOS and macOS apps.

## Installation

Add to your `Package.swift`:

```swift
dependencies: [
    .package(url: "https://github.com/phase-analytics/Phase.git", from: "0.0.9")
]
```

Or in Xcode: **File → Add Package Dependencies** → paste the URL.

## Quick Start

### SwiftUI

```swift
import PhaseAnalytics

@main
struct MyApp: App {
    var body: some Scene {
        WindowGroup {
            Phase(apiKey: "phase_xxx") {
                ContentView()
            }
        }
    }
}
```

### UIKit

```swift
import PhaseAnalytics

@main
class AppDelegate: UIResponder, UIApplicationDelegate {
    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        Task {
            try await PhaseSDK.shared.initialize(apiKey: "phase_xxx")
        }
        return true
    }
}
```

## Usage

### Track Events

```swift
track("button_click", ["button_id": "submit"])

track("purchase", ["amount": 99.99, "currency": "USD"])
```

### Track Screens

SwiftUI:

```swift
struct ProfileView: View {
    var body: some View {
        Text("Profile")
            .phaseScreen("ProfileView")
    }
}
```

Manual:

```swift
trackScreen("/settings")
```

## Configuration

```swift
Phase(
    apiKey: "phase_xxx",
    baseURL: "https://your-api.com",   // Self-hosted
    logLevel: .debug,                  // .debug | .info | .error | .none
    deviceInfo: true,                  // Collect device metadata
    userLocale: true                   // Enable geolocation
) {
    ContentView()
}
```

## Requirements

- iOS 13.0+ / macOS 10.15+
- Swift 5.9+
- Xcode 15+

## License

MIT

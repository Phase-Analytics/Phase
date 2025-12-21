# Phase Analytics SDK

Analytics SDK for Swift and SwiftUI applications.

## Installation

### Swift Package Manager

```swift
dependencies: [
    .package(url: "https://github.com/phase-analytics/swift-sdk.git", from: "1.0.0")
]
```

## SwiftUI

### Setup

Wrap your app with `Phase`:

```swift
import SwiftUI
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

### Track Screens

Use the `.phaseScreen()` modifier to automatically track screen views:

```swift
import SwiftUI
import PhaseAnalytics

struct HomeView: View {
    var body: some View {
        Text("Home")
            .phaseScreen("HomeView")
    }
}

struct ProfileView: View {
    var body: some View {
        Text("Profile")
            .phaseScreen("ProfileView", params: ["user_id": "123"])
    }
}
```

### Usage

```swift
import PhaseAnalytics

// Identify user (call after login or on app start)
await PhaseSDK.shared.identify(["user_id": "123", "plan": "premium"])

// Track events
track("purchase", ["amount": 99.99, "currency": "USD"])
trackScreen("/settings", ["section": "privacy"])
```

### Options

```swift
Phase(
    apiKey: "phase_xxx",           // Required: Your Phase API key
    baseURL: "https://api.phase.sh", // Optional: Custom API endpoint
    logLevel: .info,               // Optional: .none, .info, .warn, .error
    deviceInfo: true,              // Optional: Collect device metadata
    userLocale: true               // Optional: Collect locale & geolocation
) {
    ContentView()
}
```

## UIKit

### Setup

Initialize the SDK in your AppDelegate or SceneDelegate:

```swift
import PhaseAnalytics

func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
) -> Bool {
    Task {
        try await PhaseSDK.shared.initialize(apiKey: "phase_xxx")
    }
    return true
}
```

### Usage

```swift
import PhaseAnalytics

// Identify user
Task {
    await PhaseSDK.shared.identify(["user_id": "123", "plan": "premium"])
}

// Track events
PhaseSDK.shared.track("purchase", params: ["amount": 99.99, "currency": "USD"])
PhaseSDK.shared.trackScreen("/home", params: ["tab": "feed"])

// Or use global functions
track("button_click", ["button_id": "checkout"])
trackScreen("/profile")
```

## API

### `PhaseSDK.shared.initialize(apiKey:)`

Initialize the SDK. Call this once on app start.

```swift
try await PhaseSDK.shared.initialize(
    apiKey: "phase_xxx",
    baseURL: "https://api.phase.sh",
    logLevel: .info,
    deviceInfo: true,
    userLocale: true
)
```

### `PhaseSDK.shared.identify(_:)`

Register device and start session. Call this after user login or on app start.

```swift
await PhaseSDK.shared.identify()
await PhaseSDK.shared.identify(["user_id": "123", "plan": "premium"])
```

### `PhaseSDK.shared.track(_:params:)`

Track custom events.

```swift
PhaseSDK.shared.track("purchase", params: ["amount": 99.99, "currency": "USD"])
track("button_click", ["button_id": "checkout"]) // Global function
```

### `PhaseSDK.shared.trackScreen(_:params:)`

Track screen views.

```swift
PhaseSDK.shared.trackScreen("/home", params: ["tab": "feed"])
trackScreen("/profile") // Global function
```

### `.phaseScreen(_:params:)` (SwiftUI only)

Automatically track screen when view appears.

```swift
Text("Home")
    .phaseScreen("HomeView")
    .phaseScreen("HomeView", params: ["user_id": "123"])
```

## Notes

- SDK automatically queues calls if not initialized yet
- Screen names are automatically normalized (e.g., "HomeView" → "/home-view")
- All tracking calls are thread-safe and safe to call immediately
- Supports offline queueing and automatic retry

import SwiftUI

/// Phase Analytics Provider for SwiftUI
///
/// Wrap your root view with this component to enable analytics.
///
/// - Parameters:
///   - apiKey: Your Phase API key (required, starts with "phase_")
///   - baseURL: Custom API endpoint for self-hosting (optional, default: "https://api.phase.sh")
///   - logLevel: Logging level (optional, default: `.none`)
///   - deviceInfo: Collect device metadata (optional, default: `true`)
///   - userLocale: Collect user locale + geolocation (optional, default: `true`)
///   - content: Your app content (required)
///
/// ## Setup
/// ```swift
/// @main
/// struct MyApp: App {
///     var body: some Scene {
///         WindowGroup {
///             Phase(apiKey: "phase_xxx") {
///                 ContentView()
///             }
///         }
///     }
/// }
/// ```
///
/// ## Track Events
/// ```swift
/// import PhaseAnalytics
///
/// Button("Purchase") {
///     track("purchase", ["amount": 99.99, "currency": "USD"])
/// }
/// ```
///
/// ## Track Screens
/// ```swift
/// struct ProfileView: View {
///     var body: some View {
///         Text("Profile")
///             .phaseScreen("ProfileView", params: ["user_id": "123"])
///     }
/// }
/// ```
@MainActor
public struct Phase<Content: View>: View {
    let apiKey: String
    let baseURL: String
    let logLevel: LogLevel
    let deviceInfo: Bool
    let userLocale: Bool
    let content: Content

    @State private var isInitialized = false

    public init(
        apiKey: String,
        baseURL: String = "https://api.phase.sh",
        logLevel: LogLevel = .none,
        deviceInfo: Bool = true,
        userLocale: Bool = true,
        @ViewBuilder content: () -> Content
    ) {
        self.apiKey = apiKey
        self.baseURL = baseURL
        self.logLevel = logLevel
        self.deviceInfo = deviceInfo
        self.userLocale = userLocale
        self.content = content()
    }

    public var body: some View {
        content
            .onAppear {
                guard !isInitialized else { return }

                Task {
                    do {
                        try await PhaseSDK.shared.initialize(
                            apiKey: apiKey,
                            baseURL: baseURL,
                            logLevel: logLevel,
                            deviceInfo: deviceInfo,
                            userLocale: userLocale
                        )
                        isInitialized = true
                    } catch {
                        logger.error("Failed to initialize Phase SDK", error)
                    }
                }
            }
    }
}

public struct PhaseScreenModifier: ViewModifier {
    let screenName: String
    let params: [String: Any]?

    @State private var hasAppeared = false

    public func body(content: Content) -> some View {
        content.onAppear {
            guard !hasAppeared else { return }
            hasAppeared = true

            let formattedName = PhaseSDK.formatScreenName(screenName)
            let eventParams = params.map { EventParams($0) }

            PhaseSDK.shared.trackScreen(formattedName, params: eventParams)
        }
    }
}

extension View {
    /// Track screen view when this view appears
    ///
    /// - Parameters:
    ///   - name: Screen name (will be converted to kebab-case path, e.g. "HomeView" → "/home-view")
    ///   - params: Additional parameters (optional)
    ///
    /// ## Example
    /// ```swift
    /// struct ProfileView: View {
    ///     var body: some View {
    ///         Text("Profile")
    ///             .phaseScreen("ProfileView", params: ["user_id": "123"])
    ///     }
    /// }
    /// ```
    public func phaseScreen(_ name: String, params: [String: Any]? = nil) -> some View {
        modifier(PhaseScreenModifier(screenName: name, params: params))
    }
}

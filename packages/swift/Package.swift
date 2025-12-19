// swift-tools-version: 6.0
import PackageDescription

let package = Package(
    name: "PhaseAnalytics",
    platforms: [
        .iOS(.v15),
        .macOS(.v12)
    ],
    products: [
        .library(
            name: "PhaseAnalytics",
            targets: ["PhaseAnalytics"]
        ),
    ],
    dependencies: [
        .package(url: "https://github.com/yaslab/ULID.swift.git", from: "1.3.1"),
        .package(url: "https://github.com/1024jp/GzipSwift.git", from: "6.1.0")
    ],
    targets: [
        .target(
            name: "PhaseAnalytics",
            dependencies: [
                .product(name: "ULID", package: "ULID.swift"),
                .product(name: "Gzip", package: "GzipSwift")
            ],
            path: "Sources/PhaseAnalytics"
        )
    ]
)

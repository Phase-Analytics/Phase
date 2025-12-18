.PHONY: build lint lint-fix format format-check check clean test

build:
	swift build

lint:
	swiftlint lint Sources

lint-fix:
	swiftlint lint --fix Sources

format:
	swift-format --in-place --recursive Sources

format-check:
	swift-format lint --recursive Sources

check: lint build
	@echo "✅ All checks passed!"

clean:
	swift package clean
	rm -rf .build

test:
	swift test

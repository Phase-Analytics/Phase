import Foundation

internal struct Validator {

    static func validateDeviceID(_ deviceID: String) -> Result<Void, PhaseError> {
        guard deviceID.count >= ValidationConstants.DeviceID.minLength else {
            return .failure(
                .validationFailed(
                    "Device ID must be at least \(ValidationConstants.DeviceID.minLength) characters"
                ))
        }

        guard deviceID.count <= ValidationConstants.DeviceID.maxLength else {
            return .failure(
                .validationFailed(
                    "Device ID must not exceed \(ValidationConstants.DeviceID.maxLength) characters"
                ))
        }

        guard deviceID.range(of: ValidationConstants.DeviceID.pattern, options: .regularExpression) != nil else {
            return .failure(
                .validationFailed(
                    "Device ID must match pattern: \(ValidationConstants.DeviceID.pattern)"
                ))
        }

        return .success(())
    }

    static func validateSessionID(_ sessionID: String) -> Result<Void, PhaseError> {
        guard sessionID.count >= ValidationConstants.SessionID.minLength else {
            return .failure(
                .validationFailed(
                    "Session ID must be at least \(ValidationConstants.SessionID.minLength) characters"
                ))
        }

        guard sessionID.count <= ValidationConstants.SessionID.maxLength else {
            return .failure(
                .validationFailed(
                    "Session ID must not exceed \(ValidationConstants.SessionID.maxLength) characters"
                ))
        }

        guard sessionID.range(of: ValidationConstants.SessionID.pattern, options: .regularExpression) != nil else {
            return .failure(
                .validationFailed(
                    "Session ID must match pattern: \(ValidationConstants.SessionID.pattern)"
                ))
        }

        return .success(())
    }

    static func validateEventName(_ name: String) -> Result<Void, PhaseError> {
        guard name.count >= ValidationConstants.EventName.minLength else {
            return .failure(
                .validationFailed(
                    "Event name must be at least \(ValidationConstants.EventName.minLength) character(s)"
                ))
        }

        guard name.count <= ValidationConstants.EventName.maxLength else {
            return .failure(
                .validationFailed(
                    "Event name must not exceed \(ValidationConstants.EventName.maxLength) characters"
                ))
        }

        guard name.range(of: ValidationConstants.EventName.pattern, options: .regularExpression) != nil else {
            return .failure(
                .validationFailed(
                    "Event name must match pattern: \(ValidationConstants.EventName.pattern)"
                ))
        }

        return .success(())
    }

    static func validateEventParams(_ params: EventParams?) -> Result<Void, PhaseError> {
        guard let params = params else {
            return .success(())
        }

        let dict = params.dictionary

        let depth = getObjectDepth(dict)
        guard depth <= ValidationConstants.EventParams.maxDepth else {
            return .failure(
                .validationFailed(
                    "Event params exceed maximum depth of \(ValidationConstants.EventParams.maxDepth) (got \(depth))"
                ))
        }

        do {
            let data = try JSONSerialization.data(withJSONObject: dict, options: [])
            guard data.count <= ValidationConstants.EventParams.maxSize else {
                return .failure(
                    .validationFailed(
                        "Event params exceed maximum size of \(ValidationConstants.EventParams.maxSize) bytes"
                    ))
            }
        } catch {
            return .failure(.validationFailed("Event params must be JSON serializable"))
        }

        return .success(())
    }

    private static func getObjectDepth(
        _ obj: Any,
        currentDepth: Int = 1,
        visited: Set<ObjectIdentifier> = []
    ) -> Int {
        if let dict = obj as? [String: Any] {
            let objId = ObjectIdentifier(dict as AnyObject)
            if visited.contains(objId) {
                return currentDepth
            }

            var newVisited = visited
            newVisited.insert(objId)

            var maxDepth = currentDepth
            for value in dict.values {
                let depth = getObjectDepth(value, currentDepth: currentDepth + 1, visited: newVisited)
                maxDepth = max(maxDepth, depth)
            }
            return maxDepth
        }

        if let array = obj as? [Any] {
            let objId = ObjectIdentifier(array as AnyObject)
            if visited.contains(objId) {
                return currentDepth
            }

            var newVisited = visited
            newVisited.insert(objId)

            var maxDepth = currentDepth
            for item in array {
                let depth = getObjectDepth(item, currentDepth: currentDepth + 1, visited: newVisited)
                maxDepth = max(maxDepth, depth)
            }
            return maxDepth
        }

        return currentDepth
    }
}

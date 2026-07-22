export const POLICY_DEFAULT_HOST = 'phase.sh';
export const POLICY_PATH_PREFIX = '/p';

/** Internal content URL — never shown in dashboard UI. Short links redirect here. */
export function buildPolicyDestinationUrl(policyId: string): string {
  return `https://${POLICY_DEFAULT_HOST}${POLICY_PATH_PREFIX}/${policyId}`;
}

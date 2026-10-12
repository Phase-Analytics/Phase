const COUNTRY_CODE_REGEX = /^[A-Za-z]{2}$/;

// Constructing Intl.DisplayNames is costly; build it once per module.
const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });

export function isCountryCode(
  value: string | null | undefined
): value is string {
  return Boolean(value && COUNTRY_CODE_REGEX.test(value));
}

export function getCountryLabel(countryCode: string | null | undefined) {
  if (!(countryCode && isCountryCode(countryCode))) {
    return 'Unknown';
  }
  return regionNames.of(countryCode.toUpperCase()) || countryCode;
}

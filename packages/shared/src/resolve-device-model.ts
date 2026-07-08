import { APPLE_DEVICE_IDENTIFIERS } from './apple-device-identifiers';

const APPLE_MACHINE_ID_PATTERN =
  /^(iPhone|iPad|iPod|Watch|AppleTV|RealityDevice)\d+,\d+$/;

function escapeSqlString(value: string): string {
  return value.replace(/'/g, "''");
}

export function isAppleMachineId(model: string): boolean {
  return APPLE_MACHINE_ID_PATTERN.test(model);
}

export function resolveDeviceModel(
  model: string | null | undefined
): string | null {
  if (model == null) {
    return null;
  }

  const trimmed = model.trim();
  if (!trimmed) {
    return null;
  }

  if (!isAppleMachineId(trimmed)) {
    return trimmed;
  }

  const mapped = APPLE_DEVICE_IDENTIFIERS[trimmed];
  if (mapped) {
    return mapped;
  }

  if (trimmed.startsWith('iPhone')) {
    return 'iPhone';
  }
  if (trimmed.startsWith('iPad')) {
    return 'iPad';
  }
  if (trimmed.startsWith('iPod')) {
    return 'iPod touch';
  }
  if (trimmed.startsWith('Watch')) {
    return 'Apple Watch';
  }
  if (trimmed.startsWith('AppleTV')) {
    return 'Apple TV';
  }
  if (trimmed.startsWith('RealityDevice')) {
    return 'Apple Vision';
  }

  return trimmed;
}

export function buildResolveDeviceModelSql(columnExpression = 'model'): string {
  const whenClauses = Object.entries(APPLE_DEVICE_IDENTIFIERS)
    .map(
      ([id, name]) =>
        `WHEN ${columnExpression} = '${escapeSqlString(id)}' THEN '${escapeSqlString(name)}'`
    )
    .join('\n      ');

  return `CASE
      ${whenClauses}
      WHEN ${columnExpression} ~ '^(iPhone|iPad|iPod|Watch|AppleTV|RealityDevice)[0-9]+,[0-9]+$' THEN
        CASE
          WHEN ${columnExpression} LIKE 'iPhone%' THEN 'iPhone'
          WHEN ${columnExpression} LIKE 'iPad%' THEN 'iPad'
          WHEN ${columnExpression} LIKE 'iPod%' THEN 'iPod touch'
          WHEN ${columnExpression} LIKE 'Watch%' THEN 'Apple Watch'
          WHEN ${columnExpression} LIKE 'AppleTV%' THEN 'Apple TV'
          WHEN ${columnExpression} LIKE 'RealityDevice%' THEN 'Apple Vision'
          ELSE ${columnExpression}
        END
      ELSE ${columnExpression}
    END`;
}

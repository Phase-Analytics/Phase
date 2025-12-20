import type { PropertySearchCondition } from '@phase/shared';
import { type SQL, sql } from 'drizzle-orm';
import type { PgColumn } from 'drizzle-orm/pg-core';

export function buildPropertySearchFilters(
  propertyColumn: PgColumn,
  conditions: PropertySearchCondition[]
): SQL[] {
  const filters: SQL[] = [];

  for (const condition of conditions) {
    const { key, operator, value } = condition;

    if (value === null) {
      if (operator === 'eq') {
        filters.push(
          sql`(${propertyColumn}->>${key})::text IS NULL OR ${propertyColumn}->>${key} = 'null'`
        );
      } else if (operator === 'neq') {
        filters.push(
          sql`(${propertyColumn}->>${key})::text IS NOT NULL AND ${propertyColumn}->>${key} != 'null'`
        );
      }
      continue;
    }

    if (typeof value === 'boolean') {
      const boolStr = value.toString();
      if (operator === 'eq') {
        filters.push(sql`${propertyColumn}->>${key} = ${boolStr}`);
      } else if (operator === 'neq') {
        filters.push(sql`${propertyColumn}->>${key} != ${boolStr}`);
      }
    } else if (typeof value === 'number') {
      const valueStr = value.toString();

      switch (operator) {
        case 'eq':
          filters.push(
            sql`(${propertyColumn}->>${key})::numeric = ${valueStr}::numeric`
          );
          break;
        case 'neq':
          filters.push(
            sql`(${propertyColumn}->>${key})::numeric != ${valueStr}::numeric`
          );
          break;
        case 'gt':
          filters.push(
            sql`(${propertyColumn}->>${key})::numeric > ${valueStr}::numeric`
          );
          break;
        case 'lt':
          filters.push(
            sql`(${propertyColumn}->>${key})::numeric < ${valueStr}::numeric`
          );
          break;
        case 'gte':
          filters.push(
            sql`(${propertyColumn}->>${key})::numeric >= ${valueStr}::numeric`
          );
          break;
        case 'lte':
          filters.push(
            sql`(${propertyColumn}->>${key})::numeric <= ${valueStr}::numeric`
          );
          break;
        default:
          break;
      }
    } else if (typeof value === 'string') {
      const lowerValue = value.toLowerCase();

      switch (operator) {
        case 'eq':
          filters.push(sql`LOWER(${propertyColumn}->>${key}) = ${lowerValue}`);
          break;
        case 'neq':
          filters.push(sql`LOWER(${propertyColumn}->>${key}) != ${lowerValue}`);
          break;
        case 'contains':
          filters.push(
            sql`LOWER(${propertyColumn}->>${key}) LIKE ${`%${lowerValue}%`}`
          );
          break;
        case 'startsWith':
          filters.push(
            sql`LOWER(${propertyColumn}->>${key}) LIKE ${`${lowerValue}%`}`
          );
          break;
        case 'endsWith':
          filters.push(
            sql`LOWER(${propertyColumn}->>${key}) LIKE ${`%${lowerValue}`}`
          );
          break;
        case 'gt':
          filters.push(sql`LOWER(${propertyColumn}->>${key}) > ${lowerValue}`);
          break;
        case 'lt':
          filters.push(sql`LOWER(${propertyColumn}->>${key}) < ${lowerValue}`);
          break;
        case 'gte':
          filters.push(sql`LOWER(${propertyColumn}->>${key}) >= ${lowerValue}`);
          break;
        case 'lte':
          filters.push(sql`LOWER(${propertyColumn}->>${key}) <= ${lowerValue}`);
          break;
        default:
          break;
      }
    }
  }

  return filters;
}

export function buildPropertyExistsFilter(
  propertyColumn: PgColumn,
  key: string
): SQL {
  return sql`${propertyColumn} ? ${key}`;
}

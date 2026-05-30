import { openai } from '@ai-sdk/openai';
import { ExploreQueryV1Schema, type ExploreQueryV1 } from '@phase/shared';
import { generateObject } from 'ai';
import { getExploreCatalog } from './catalog';
import { ExploreAiError, ExploreEngineError } from './errors';
import { getEventParamKeysSample } from './questdb-helpers';
import { validateExploreQuery } from './validate';

const DEFAULT_MODEL = 'gpt-5.4-mini';
const DEFAULT_REASONING_EFFORT = 'medium';
const MAX_ATTEMPTS = 2;

const REASONING_EFFORTS = [
  'none',
  'minimal',
  'low',
  'medium',
  'high',
  'xhigh',
] as const;

type ReasoningEffort = (typeof REASONING_EFFORTS)[number];

function parseReasoningEffort(value: string | undefined): ReasoningEffort {
  if (value && REASONING_EFFORTS.includes(value as ReasoningEffort)) {
    return value as ReasoningEffort;
  }
  return DEFAULT_REASONING_EFFORT;
}

function usesReasoningOptions(modelId: string): boolean {
  return (
    modelId.startsWith('gpt-5') ||
    modelId.startsWith('o1') ||
    modelId.startsWith('o3') ||
    modelId.startsWith('o4')
  );
}

function buildSystemPrompt(catalogContext: string): string {
  return `You convert natural language analytics questions into ExploreQueryV1 JSON for Phase Analytics.

Output ONLY valid JSON matching the schema. version must be 1. timeRange must be "7d" (the dashboard controls the visible range separately).

Grains:
- users: distinct devices (called users in UI). Use for cohorts who performed events, breakdowns by platform/country/city/locale, sessions_per_user.
- events: individual event rows in QuestDB. Use for event counts, event property aggregates (duration etc).
- sessions: session duration and session counts with device filters.

Filters (max 20):
- event_performed: { type, eventName, performed: true|false }
- event_property: { type, eventName, key, operator, value } — operators: eq, neq, gt, gte, lt, lte, contains, startsWith, endsWith
- device: { type, field: platform|country|city|locale, operator: eq|neq, value }
- device_property: custom device JSON properties

Metrics:
- count, count_distinct_users, avg, min, max, sum, field_summary, sessions_per_user
- field for avg/min/max/sum/field_summary: session_duration (sessions grain only) OR event_param { kind, eventName, paramKey }
- field_summary on events grain returns count/avg/min/max for a numeric event param

Breakdown (optional, one only):
- device: { type: "device", field: platform|country|city|locale } — users or sessions grain
- event_name: { type: "event_name" } — events grain only

groupBy: "day" only with metric sessions_per_user on users grain.

Rules:
- Prefer event names from the app catalog when available.
- Country codes are ISO 2-letter (TR not Turkey). Platform values: ios, android, web.
- For "users who did X then breakdown by Y": users grain + event_performed filter + device breakdown.
- For event property stats: events grain + event_performed + field_summary or avg/min/max with event_param.
- For filtered event counts: events grain + filters + count.
- For avg session duration with device filters: sessions grain + device filters + avg + session_duration.
- For daily sessions per user: users grain + optional device filters + sessions_per_user + groupBy day.
- Do not use p50 or p95 aggregations (not supported in engine).
- Do not use event_param breakdown type.
- Never include debug events (handled server-side).

App catalog:
${catalogContext}`;
}

async function buildCatalogContext(appId: string): Promise<string> {
  const catalog = await getExploreCatalog(appId);
  const topEvents = catalog.eventNames.slice(0, 40);
  const paramSamples = await Promise.all(
    topEvents.slice(0, 8).map(async (eventName) => {
      const keys = await getEventParamKeysSample({ appId, eventName });
      return { eventName, keys };
    })
  );

  const paramLines = paramSamples
    .filter((sample) => sample.keys.length > 0)
    .map((sample) => `  ${sample.eventName}: ${sample.keys.join(', ')}`)
    .join('\n');

  return [
    `Event names (top): ${topEvents.join(', ') || 'none'}`,
    `Platforms: ${catalog.deviceFields.platforms.join(', ') || 'unknown'}`,
    `Countries: ${catalog.deviceFields.countries.slice(0, 30).join(', ') || 'unknown'}`,
    paramLines ? `Event param keys (sample):\n${paramLines}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

export async function generateExploreQueryFromPrompt(
  appId: string,
  prompt: string
): Promise<{ query: ExploreQueryV1; summary: string }> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new ExploreAiError(
      'AI query generation is not configured on the server',
      500
    );
  }

  const modelId = process.env.OPENAI_MODEL?.trim() || DEFAULT_MODEL;
  const reasoningEffort = parseReasoningEffort(
    process.env.OPENAI_REASONING_EFFORT?.trim()
  );
  const catalogContext = await buildCatalogContext(appId);
  const system = buildSystemPrompt(catalogContext);

  let lastValidationError: string | null = null;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const userPrompt =
      attempt === 0
        ? prompt
        : `${prompt}\n\nPrevious JSON failed validation: ${lastValidationError}. Fix and return valid ExploreQueryV1.`;

    try {
      const { object } = await generateObject({
        model: openai(modelId),
        schema: ExploreQueryV1Schema,
        system,
        prompt: userPrompt,
        maxOutputTokens: 1200,
        ...(usesReasoningOptions(modelId)
          ? {
              providerOptions: {
                openai: {
                  reasoningEffort,
                },
              },
            }
          : { temperature: 0.1 }),
      });

      const parsed = ExploreQueryV1Schema.safeParse({
        ...object,
        version: 1,
        timeRange: '7d',
      });

      if (!parsed.success) {
        lastValidationError = parsed.error.message;
        continue;
      }

      try {
        validateExploreQuery(parsed.data);
      } catch (error) {
        lastValidationError =
          error instanceof ExploreEngineError
            ? error.message
            : 'Invalid query rules';
        continue;
      }

      const summary = describeQuery(parsed.data);
      return { query: parsed.data, summary };
    } catch (error) {
      if (attempt === MAX_ATTEMPTS - 1) {
        console.error('[Explore.GenerateQuery] AI error:', error);
        throw new ExploreAiError(
          'Failed to generate query. Try rephrasing your question.',
          500
        );
      }
    }
  }

  throw new ExploreAiError(
    lastValidationError ??
      'Could not generate a valid query. Try being more specific.',
    400
  );
}

function describeQuery(query: ExploreQueryV1): string {
  const parts = [
    `${query.grain} grain`,
    query.metric.aggregation,
    query.filters.length > 0 ? `${query.filters.length} filter(s)` : null,
    query.breakdown ? `breakdown by ${query.breakdown.type}` : null,
    query.groupBy ? `grouped by ${query.groupBy}` : null,
  ].filter(Boolean);

  return parts.join(' · ');
}

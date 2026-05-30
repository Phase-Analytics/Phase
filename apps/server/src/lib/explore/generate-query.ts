import { openai } from '@ai-sdk/openai';
import type { ExploreQueryV1 } from '@phase/shared';
import { generateObject } from 'ai';
import { getExploreCatalog } from './catalog';
import { ExploreAiError, ExploreEngineError } from './errors';
import {
  ExploreQueryV1AiSchema,
  parseExploreAiGeneration,
} from './explore-ai-schema';
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

function getAiErrorMessage(error: unknown): string {
  if (error && typeof error === 'object') {
    const record = error as {
      message?: string;
      data?: { error?: { message?: string } };
    };
    if (record.data?.error?.message) {
      return record.data.error.message;
    }
    if (record.message) {
      return record.message;
    }
  }
  return 'Failed to generate query. Try rephrasing your question.';
}

function isNonRetryableApiError(error: unknown): boolean {
  if (error && typeof error === 'object' && 'isRetryable' in error) {
    return error.isRetryable === false;
  }
  return false;
}

function buildSystemPrompt(catalogContext: string): string {
  return `You convert natural language analytics questions into ExploreQueryV1 JSON for Phase Analytics.

Output JSON matching the schema. version must be 1. timeRange must be "7d" (dashboard controls range separately).

Grains:
- users: distinct devices. Cohorts, platform/country breakdowns, sessions_per_user.
- events: event counts and event property aggregates.
- sessions: session duration and session counts with device filters.

Filters (max 20) — set only fields required for each type:
- event_performed: type, eventName, performed
- event_property: type, eventName, key, operator, value
- device: type, field (platform|country|city|locale), operator (eq|neq), value
- device_property: type, key, operator, value

Metric:
- aggregation: count | count_distinct_users | avg | min | max | sum | field_summary | sessions_per_user
- field (when needed): { kind: "session_duration" } OR { kind: "event_param", eventName, paramKey }

Breakdown (optional): { type: "device", field } OR { type: "event_name" }. Omit breakdown if not needed.

groupBy: "day" only with sessions_per_user on users grain.

Rules:
- Use event names from catalog when possible.
- Country codes ISO 2-letter (TR). Platform: ios, android, web.
- Do not use p50, p95, or event_param breakdown.
- Never include debug events.

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
        : `${prompt}\n\nPrevious output failed validation: ${lastValidationError}. Return corrected JSON.`;

    try {
      const { object } = await generateObject({
        model: openai(modelId),
        schema: ExploreQueryV1AiSchema,
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

      const aiParsed = ExploreQueryV1AiSchema.safeParse(object);
      if (!aiParsed.success) {
        lastValidationError = aiParsed.error.message;
        continue;
      }

      let query: ExploreQueryV1;
      try {
        query = parseExploreAiGeneration({
          ...aiParsed.data,
          version: 1,
          timeRange: '7d',
        });
      } catch (error) {
        lastValidationError =
          error instanceof Error ? error.message : 'Invalid query shape';
        continue;
      }

      try {
        validateExploreQuery(query);
      } catch (error) {
        lastValidationError =
          error instanceof ExploreEngineError
            ? error.message
            : 'Invalid query rules';
        continue;
      }

      return { query, summary: describeQuery(query) };
    } catch (error) {
      if (isNonRetryableApiError(error)) {
        console.error('[Explore.GenerateQuery] API error:', error);
        throw new ExploreAiError(getAiErrorMessage(error), 400);
      }

      if (attempt === MAX_ATTEMPTS - 1) {
        console.error('[Explore.GenerateQuery] AI error:', error);
        throw new ExploreAiError(getAiErrorMessage(error), 500);
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

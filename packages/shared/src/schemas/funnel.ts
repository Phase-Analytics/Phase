import { z } from 'zod';
import { EVENT_NAME } from '../constants/validation';
import { PaginationMetaSchema } from './common';

export const FUNNEL_ACTIVATION_WINDOW_HOURS = 72;
export const FUNNEL_ENGAGED_TOTAL_SESSION_SECONDS = 10 * 60;
export const FUNNEL_MAX_STEPS = 6;
export const FUNNEL_MIN_STEPS = 2;

export const FUNNEL_BUILTIN_STEPS = [
  { kind: 'first_seen', label: 'First Seen' },
  { kind: 'session', label: 'Create Session' },
] as const;

export const FunnelStepKindSchema = z.enum(['first_seen', 'session', 'event']);

export const FunnelCustomStepSchema = z
  .object({
    kind: FunnelStepKindSchema,
    name: z
      .string()
      .min(EVENT_NAME.MIN_LENGTH)
      .max(EVENT_NAME.MAX_LENGTH)
      .regex(EVENT_NAME.PATTERN)
      .optional(),
  })
  .superRefine((step, ctx) => {
    if (step.kind === 'event' && !step.name?.trim()) {
      ctx.addIssue({
        code: 'custom',
        message: 'Event name is required',
        path: ['name'],
      });
    }
  });

export const FunnelStepResultSchema = z.object({
  key: z.string(),
  label: z.string(),
  count: z.number().int().nonnegative(),
  conversionFromStart: z.number().min(0).max(100),
  conversionFromPrevious: z.number().min(0).max(100),
});

export const FunnelResultSchema = z.object({
  steps: z.array(FunnelStepResultSchema).min(1),
  cohortSize: z.number().int().nonnegative(),
  overallConversion: z.number().min(0).max(100),
  period: z.object({
    startDate: z.string().datetime(),
    endDate: z.string().datetime(),
  }),
});

export const ActivationFunnelQuerySchema = z.object({
  appId: z.string().min(1),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export const CustomFunnelRunRequestSchema = z.object({
  appId: z.string().min(1),
  steps: z
    .array(FunnelCustomStepSchema)
    .min(FUNNEL_MIN_STEPS)
    .max(FUNNEL_MAX_STEPS),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  windowHours: z
    .number()
    .int()
    .min(1)
    .max(24 * 30)
    .default(24 * 7),
});

export const FunnelDefinitionSchema = z.object({
  id: z.string(),
  appId: z.string(),
  name: z.string().min(1).max(80),
  steps: z
    .array(FunnelCustomStepSchema)
    .min(FUNNEL_MIN_STEPS)
    .max(FUNNEL_MAX_STEPS),
  windowHours: z
    .number()
    .int()
    .min(1)
    .max(24 * 30),
  createdByUserId: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const CreateFunnelDefinitionRequestSchema = z.object({
  appId: z.string().min(1),
  name: z.string().min(1).max(80),
  steps: z
    .array(FunnelCustomStepSchema)
    .min(FUNNEL_MIN_STEPS)
    .max(FUNNEL_MAX_STEPS),
  windowHours: z
    .number()
    .int()
    .min(1)
    .max(24 * 30)
    .default(24 * 7),
});

export const UpdateFunnelDefinitionRequestSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  steps: z
    .array(FunnelCustomStepSchema)
    .min(FUNNEL_MIN_STEPS)
    .max(FUNNEL_MAX_STEPS)
    .optional(),
  windowHours: z
    .number()
    .int()
    .min(1)
    .max(24 * 30)
    .optional(),
});

export const FunnelDefinitionsListResponseSchema = z.object({
  funnels: z.array(FunnelDefinitionSchema),
  pagination: PaginationMetaSchema.optional(),
});

export type FunnelStepKind = z.infer<typeof FunnelStepKindSchema>;
export type FunnelCustomStep = z.infer<typeof FunnelCustomStepSchema>;
export type FunnelStepResult = z.infer<typeof FunnelStepResultSchema>;
export type FunnelResult = z.infer<typeof FunnelResultSchema>;
export type FunnelDefinition = z.infer<typeof FunnelDefinitionSchema>;
export type FunnelDefinitionsListResponse = z.infer<
  typeof FunnelDefinitionsListResponseSchema
>;
export type CreateFunnelDefinitionRequest = z.infer<
  typeof CreateFunnelDefinitionRequestSchema
>;
export type UpdateFunnelDefinitionRequest = z.infer<
  typeof UpdateFunnelDefinitionRequestSchema
>;
export type CustomFunnelRunRequest = z.infer<
  typeof CustomFunnelRunRequestSchema
>;

export function funnelStepLabel(step: FunnelCustomStep): string {
  if (step.kind === 'first_seen') {
    return 'First Seen';
  }
  if (step.kind === 'session') {
    return 'Create Session';
  }
  return step.name?.trim() || 'Event';
}

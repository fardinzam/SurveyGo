import { describe, it, expect } from 'vitest'
import { getPlanLimits, canUseAI, PLAN_LIMITS } from './planLimits'

describe('getPlanLimits', () => {
  it('returns basic limits for basic plan', () => {
    const limits = getPlanLimits('basic')
    expect(limits.maxSurveys).toBe(3)
    expect(limits.maxResponsesPerSurvey).toBe(100)
    expect(limits.canExport).toBe(false)
    expect(limits.aiQuestionsPerMonth).toBe(0)
  })

  it('returns professional limits for professional plan', () => {
    const limits = getPlanLimits('professional')
    expect(limits.maxSurveys).toBe(Infinity)
    expect(limits.maxResponsesPerSurvey).toBe(Infinity)
    expect(limits.canExport).toBe(true)
    expect(limits.canAiSentiment).toBe(true)
  })

  it('falls back to basic for unknown plan', () => {
    const limits = getPlanLimits('unknown')
    expect(limits).toEqual(PLAN_LIMITS.basic)
  })
})

describe('canUseAI', () => {
  it('returns false for basic plan', () => {
    expect(canUseAI('basic')).toBe(false)
  })

  it('returns true for standard plan', () => {
    expect(canUseAI('standard')).toBe(true)
  })

  it('returns true for professional plan', () => {
    expect(canUseAI('professional')).toBe(true)
  })
})

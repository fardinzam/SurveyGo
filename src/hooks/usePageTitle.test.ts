import { describe, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'
import { usePageTitle } from './usePageTitle'

describe('usePageTitle', () => {
  it('sets document title with SurveyGo suffix', () => {
    renderHook(() => usePageTitle('Dashboard'))
    expect(document.title).toBe('Dashboard — SurveyGo')
  })

  it('sets just SurveyGo when title is empty', () => {
    renderHook(() => usePageTitle(''))
    expect(document.title).toBe('SurveyGo')
  })

  it('restores previous title on unmount', () => {
    document.title = 'Previous'
    const { unmount } = renderHook(() => usePageTitle('Test'))
    expect(document.title).toBe('Test — SurveyGo')
    unmount()
    expect(document.title).toBe('Previous')
  })
})

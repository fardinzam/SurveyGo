// src/app/components/BuilderResults.test.tsx
import '../../test/mocks/firebase'
import { describe, it, expect, vi } from 'vitest'
import { renderWithProviders } from '../../test/helpers'
import { BuilderResults } from './BuilderResults'

vi.mock('../../hooks/useResponses', () => ({
  useResponses: () => ({ data: [], isLoading: false }),
}))
vi.mock('../../hooks/useSurveys', () => ({
  useSurvey: () => ({ data: { title: 'My Survey', status: 'active', questions: [] }, isLoading: false }),
}))
vi.mock('../../hooks/useSubscription', () => ({
  useSubscription: () => ({ limits: { canExport: true } }),
}))

describe('BuilderResults', () => {
  it('renders without crashing', () => {
    const { container } = renderWithProviders(<BuilderResults surveyId="test-id" />)
    expect(container).toBeTruthy()
  })

  it('shows survey title in header', () => {
    const { getByText } = renderWithProviders(<BuilderResults surveyId="test-id" />)
    expect(getByText('My Survey')).toBeInTheDocument()
  })

  it('renders all four tabs', () => {
    const { getByText } = renderWithProviders(<BuilderResults surveyId="test-id" />)
    expect(getByText('Overview')).toBeInTheDocument()
    expect(getByText('Questions')).toBeInTheDocument()
    expect(getByText('Responses')).toBeInTheDocument()
    expect(getByText('Insights')).toBeInTheDocument()
  })

  it('shows no-responses empty state in Overview', () => {
    const { getByText } = renderWithProviders(<BuilderResults surveyId="test-id" />)
    expect(getByText('No responses yet')).toBeInTheDocument()
  })
})

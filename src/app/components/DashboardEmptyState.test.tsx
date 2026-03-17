import '../../test/mocks/firebase'
import { describe, it, expect, vi } from 'vitest'
import { renderWithProviders } from '../../test/helpers'
import { DashboardEmptyState } from './DashboardEmptyState'

describe('DashboardEmptyState', () => {
  it('renders without crashing', () => {
    const { getByText } = renderWithProviders(
      <DashboardEmptyState onNavigate={vi.fn()} />,
    )
    expect(getByText('Welcome to SurveyGo!')).toBeInTheDocument()
  })
})

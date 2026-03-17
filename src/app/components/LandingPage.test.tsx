import '../../test/mocks/firebase'
import { describe, it, expect, vi } from 'vitest'
import { renderWithProviders } from '../../test/helpers'
import { LandingPage } from './LandingPage'

describe('LandingPage', () => {
  it('renders without crashing', () => {
    const { getByText } = renderWithProviders(
      <LandingPage onNavigate={vi.fn()} />,
    )
    expect(getByText('AI-Powered Analysis')).toBeInTheDocument()
  })
})

import '../../test/mocks/firebase'
import { describe, it, expect, vi } from 'vitest'
import { renderWithProviders } from '../../test/helpers'
import { LoginPage } from './LoginPage'

describe('LoginPage', () => {
  it('renders without crashing', () => {
    const { getByText } = renderWithProviders(
      <LoginPage onNavigate={vi.fn()} />,
    )
    expect(getByText('Welcome back')).toBeInTheDocument()
  })
})

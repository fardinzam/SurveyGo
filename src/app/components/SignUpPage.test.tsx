import '../../test/mocks/firebase'
import { describe, it, expect, vi } from 'vitest'
import { renderWithProviders } from '../../test/helpers'
import { SignUpPage } from './SignUpPage'

describe('SignUpPage', () => {
  it('renders without crashing', () => {
    const { getByText } = renderWithProviders(
      <SignUpPage onNavigate={vi.fn()} />,
    )
    expect(getByText('Create your account')).toBeInTheDocument()
  })
})

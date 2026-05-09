// src/app/components/BuilderConnect.test.tsx
import '../../test/mocks/firebase'
import { describe, it, expect } from 'vitest'
import { fireEvent } from '@testing-library/react'
import { renderWithProviders } from '../../test/helpers'
import { BuilderConnect } from './BuilderConnect'

describe('BuilderConnect', () => {
  it('renders Connect & Automate header', () => {
    const { getByText } = renderWithProviders(<BuilderConnect />)
    expect(getByText('Connect & Automate')).toBeInTheDocument()
  })

  it('renders Apps tab content by default', () => {
    const { getByPlaceholderText } = renderWithProviders(<BuilderConnect />)
    expect(getByPlaceholderText('Search integrations...')).toBeInTheDocument()
  })

  it('switches to Webhooks tab', () => {
    const { getByRole, getByText } = renderWithProviders(<BuilderConnect />)
    fireEvent.click(getByRole('button', { name: 'Webhooks' }))
    expect(getByText('Add a Webhook')).toBeInTheDocument()
  })
})

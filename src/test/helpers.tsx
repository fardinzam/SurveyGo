import React, { type ReactElement } from 'react'
import { render, type RenderOptions } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { mockUser } from './mocks/firebase'

// Mock AuthContext to provide a fake authenticated user
const MockAuthProvider = ({ children }: { children: React.ReactNode }) => {
  const AuthContext = React.createContext({
    user: mockUser as any,
    loading: false,
    isAuthenticated: true,
  })

  return (
    <AuthContext.Provider value={{ user: mockUser as any, loading: false, isAuthenticated: true }}>
      {children}
    </AuthContext.Provider>
  )
}

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
})

function AllProviders({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <MockAuthProvider>{children}</MockAuthProvider>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

export function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) {
  return render(ui, { wrapper: AllProviders, ...options })
}

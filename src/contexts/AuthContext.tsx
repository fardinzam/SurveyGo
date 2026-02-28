import React, { createContext, useContext, type ReactNode } from 'react'
import { type User } from 'firebase/auth'
import { useAuth } from '../hooks/useAuth'

interface AuthContextType {
    user: User | null
    loading: boolean
    isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
    isAuthenticated: false,
})

/**
 * Provides auth state to the entire component tree.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
    const authState = useAuth()

    return (
        <AuthContext.Provider value={authState}>
            {children}
        </AuthContext.Provider>
    )
}

/**
 * Access auth state from any component.
 */
export function useAuthContext() {
    return useContext(AuthContext)
}

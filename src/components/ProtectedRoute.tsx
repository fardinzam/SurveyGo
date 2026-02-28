import React from 'react'
import { Navigate, useLocation } from 'react-router'
import { useAuthContext } from '../contexts/AuthContext'

/**
 * Wraps a route to require authentication.
 * Redirects to /auth/login if the user is not authenticated.
 * Preserves the attempted URL so we can redirect back after login.
 */
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const { isAuthenticated, loading } = useAuthContext()
    const location = useLocation()

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                    <span className="text-muted-foreground text-sm">Loading...</span>
                </div>
            </div>
        )
    }

    if (!isAuthenticated) {
        return <Navigate to="/auth/login" state={{ from: location.pathname }} replace />
    }

    return <>{children}</>
}

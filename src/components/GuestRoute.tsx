import React from 'react'
import { Navigate } from 'react-router'
import { useAuthContext } from '../contexts/AuthContext'

/**
 * Wraps a route that should only be accessible to unauthenticated users
 * (e.g. login, signup). If the user is already logged in, redirects to dashboard.
 */
export function GuestRoute({ children }: { children: React.ReactNode }) {
    const { isAuthenticated, loading } = useAuthContext()

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

    if (isAuthenticated) {
        return <Navigate to="/app/dashboard" replace />
    }

    return <>{children}</>
}

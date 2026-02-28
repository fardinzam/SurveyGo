import { useEffect, useState } from 'react'
import { onAuthStateChanged, type User } from 'firebase/auth'
import { auth } from '../lib/firebase'

interface AuthState {
    user: User | null
    loading: boolean
    isAuthenticated: boolean
}

/**
 * Hook that subscribes to Firebase auth state changes.
 * Returns the current user, loading state, and authentication status.
 */
export function useAuth(): AuthState {
    const [user, setUser] = useState<User | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
            setUser(firebaseUser)
            setLoading(false)
        })

        return () => unsubscribe()
    }, [])

    return {
        user,
        loading,
        isAuthenticated: !!user,
    }
}

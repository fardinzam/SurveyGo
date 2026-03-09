import { useEffect, useState, useRef } from 'react'
import { onAuthStateChanged, type User } from 'firebase/auth'
import { auth } from '../lib/firebase'

interface AuthState {
    user: User | null
    loading: boolean
    isAuthenticated: boolean
}

/**
 * Hook that subscribes to Firebase auth state changes.
 * Uses authStateReady() to wait for IndexedDB persistence to resolve
 * before making any authentication decisions.
 */
export function useAuth(): AuthState {
    const [user, setUser] = useState<User | null>(null)
    const [loading, setLoading] = useState(true)
    const readyRef = useRef(false)

    useEffect(() => {
        // Wait for Firebase to fully resolve auth state from IndexedDB.
        // Without this, onAuthStateChanged fires with null before IndexedDB
        // has loaded, causing ProtectedRoute to redirect to login prematurely.
        auth.authStateReady().then(() => {
            readyRef.current = true
            setUser(auth.currentUser)
            setLoading(false)
        })

        // Subscribe to subsequent auth state changes (login, logout).
        // Gated by readyRef to ignore the premature null fire before IndexedDB loads.
        const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
            if (readyRef.current) {
                setUser(firebaseUser)
                setLoading(false)
            }
        })

        return () => unsubscribe()
    }, [])

    return {
        user,
        loading,
        isAuthenticated: !!user,
    }
}

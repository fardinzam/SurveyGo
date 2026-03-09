import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signInWithPopup,
    GoogleAuthProvider,
    signOut as firebaseSignOut,
    updateProfile as firebaseUpdateProfile,
    updatePassword as firebaseUpdatePassword,
    deleteUser,
    sendPasswordResetEmail,
    setPersistence,
    indexedDBLocalPersistence,
    browserSessionPersistence,
    type User,
} from 'firebase/auth'
import { doc, setDoc, deleteDoc, getDocs, collection, query, where, serverTimestamp } from 'firebase/firestore'
import { auth, db } from './firebase'

const googleProvider = new GoogleAuthProvider()
googleProvider.addScope('profile')
googleProvider.addScope('email')

/**
 * Sign in with email and password.
 */
export async function signInWithEmail(email: string, password: string) {
    const result = await signInWithEmailAndPassword(auth, email, password)
    return result.user
}

/**
 * Create a new account with email and password.
 * Also creates a user profile document in Firestore.
 */
export async function signUpWithEmail(email: string, password: string, displayName?: string) {
    const result = await createUserWithEmailAndPassword(auth, email, password)
    const user = result.user

    // Set display name if provided
    if (displayName) {
        await firebaseUpdateProfile(user, { displayName })
    }

    // Create user profile in Firestore
    await createUserProfile(user, displayName)

    return user
}

/**
 * Sign in with Google OAuth popup.
 */
export async function signInWithGoogle() {
    const result = await signInWithPopup(auth, googleProvider)

    // Create/update user profile on first Google sign-in
    await createUserProfile(result.user)

    return result.user
}

/**
 * Sign out the current user.
 */
export async function signOut() {
    await firebaseSignOut(auth)
}

/**
 * Update the current user's display name.
 */
export async function updateProfile(user: User, data: { displayName?: string; photoURL?: string }) {
    await firebaseUpdateProfile(user, data)
}

/**
 * Update the current user's password.
 */
export async function updatePassword(user: User, newPassword: string) {
    await firebaseUpdatePassword(user, newPassword)
}

/**
 * Create or update a user profile document in Firestore.
 */
async function createUserProfile(user: User, displayName?: string) {
    const userRef = doc(db, 'users', user.uid)
    await setDoc(userRef, {
        email: user.email,
        displayName: displayName || user.displayName || '',
        photoURL: user.photoURL || '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    }, { merge: true })
}

/**
 * Delete the current user's account.
 * Removes all their surveys, their Firestore profile, and their Firebase Auth account.
 */
export async function deleteAccount(user: User): Promise<void> {
    // 1. Delete all surveys owned by this user
    const surveysQuery = query(collection(db, 'surveys'), where('createdBy', '==', user.uid))
    const surveysSnap = await getDocs(surveysQuery)
    const deletions = surveysSnap.docs.map((d) => deleteDoc(d.ref))
    await Promise.all(deletions)

    // 2. Delete user profile from Firestore
    await deleteDoc(doc(db, 'users', user.uid))

    // 3. Delete Firebase Auth account
    await deleteUser(user)
}

/**
 * Send a password reset email.
 */
export async function resetPassword(email: string) {
    await sendPasswordResetEmail(auth, email)
}

/**
 * Toggle auth persistence.
 * rememberMe = true  → indexedDBLocalPersistence (survives browser close)
 * rememberMe = false → browserSessionPersistence (cleared on browser close)
 *
 * Falls back gracefully if the browser denies storage access.
 */
export async function setAuthPersistence(rememberMe: boolean) {
    try {
        await setPersistence(
            auth,
            rememberMe ? indexedDBLocalPersistence : browserSessionPersistence,
        )
    } catch {
        // IndexedDB or localStorage may be blocked (e.g. incognito, restrictive browser settings).
        // Fall back to session persistence, then give up silently (Firebase uses in-memory as last resort).
        try {
            await setPersistence(auth, browserSessionPersistence)
        } catch {
            console.warn('[SurveyGo] Could not set auth persistence — using in-memory fallback.')
        }
    }
}

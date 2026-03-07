import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from './firebase';

/**
 * Upload an image file to Firebase Storage and return the public download URL.
 * Images are stored under `surveys/{path}`.
 */
export async function uploadImage(file: File, path: string): Promise<string> {
    const storageRef = ref(storage, `surveys/${path}`);
    await uploadBytes(storageRef, file);
    return getDownloadURL(storageRef);
}

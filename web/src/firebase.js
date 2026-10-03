import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "AIzaSyCJbg-_3nQ8sswvn6aw49Zn2fCXniFtNEw",
  authDomain: "feel-eb5dc.firebaseapp.com",
  projectId: "feel-eb5dc",
  storageBucket: "feel-eb5dc.firebasestorage.app",
  messagingSenderId: "141891121749",
  appId: "1:141891121749:web:059161bc6f81ca9c819adc"
}

const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const db = getFirestore(app)
export const googleProvider = new GoogleAuthProvider()

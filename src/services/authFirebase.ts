// src/services/authFirebase.ts
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User,
} from "firebase/auth";
import { auth } from "../lib/firebase";

/**
 * Fungsi untuk melakukan autentikasi / login pengguna ke Firebase Auth.
 * Menggunakan email dan password yang diberikan.
 */
export function login(email: string, password: string) {
  return signInWithEmailAndPassword(auth, email, password);
}

/**
 * Fungsi untuk mengeluarkan pengguna (logout) dari sesi autentikasi Firebase.
 */
export function logout() {
  return signOut(auth);
}

/**
 * Listener real-time untuk mendeteksi perubahan status login (auth state).
 * Callback akan terpanggil setiap kali pengguna login, logout, atau saat inisialisasi aplikasi.
 * Mengembalikan fungsi Unsubscribe untuk membersihkan listener saat komponen dilepas.
 */
export function listenAuth(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

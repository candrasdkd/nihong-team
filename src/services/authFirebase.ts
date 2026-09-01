// src/services/authFirebase.ts
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User,
} from "firebase/auth";
import { auth } from "../lib/firebase";
import {
  loginNihongStoreAdmin,
  logoutNihongStoreAdmin,
} from "./nihongStoreFirebase";

/**
 * Fungsi untuk melakukan autentikasi / login pengguna ke Firebase Auth.
 * Menggunakan email dan password yang diberikan.
 */
export async function login(email: string, password: string) {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  try {
    await loginNihongStoreAdmin(email, password);
    return credential;
  } catch (error) {
    await signOut(auth);
    throw error;
  }
}

/**
 * Fungsi untuk mengeluarkan pengguna (logout) dari sesi autentikasi Firebase.
 */
export async function logout() {
  await Promise.allSettled([
    signOut(auth),
    logoutNihongStoreAdmin(),
  ]);
}

/**
 * Listener real-time untuk mendeteksi perubahan status login (auth state).
 * Callback akan terpanggil setiap kali pengguna login, logout, atau saat inisialisasi aplikasi.
 * Mengembalikan fungsi Unsubscribe untuk membersihkan listener saat komponen dilepas.
 */
export function listenAuth(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

// src/services/settingsFirebase.ts
import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";
import { AppSettings } from "../types";

// Nama dokumen tunggal di Firestore yang menyimpan konfigurasi global
const SETTINGS_DOC = "global";

/**
 * Mendengarkan (subscribe) perubahan dokumen pengaturan global aplikasi secara real-time.
 * Pengaturan ini berisi konfigurasi default seperti harga jastip per Kg, kurs Yen, dll.
 * 
 * @param onUpdate - Callback yang dijalankan setiap kali ada perubahan pada data pengaturan.
 */
export function subscribeSettings(onUpdate: (data: AppSettings | null) => void) {
  const ref = doc(db, "settings", SETTINGS_DOC);
  return onSnapshot(ref, (snap) => {
    if (snap.exists()) {
      onUpdate(snap.data() as AppSettings);
    } else {
      // Mengirimkan null jika dokumen pengaturan belum pernah dibuat di database
      onUpdate(null);
    }
  });
}

/**
 * Memperbarui pengaturan global di Firestore.
 * Menggunakan operasi merge agar field lain yang tidak diperbarui tidak hilang.
 * 
 * @param updates - Object berisi field pengaturan yang ingin diubah.
 */
export async function updateSettings(updates: Partial<AppSettings>) {
  const ref = doc(db, "settings", SETTINGS_DOC);
  const snap = await getDoc(ref);
  const payload = {
    ...updates,
    updatedAt: new Date().toISOString() // Menyimpan jejak waktu pembaruan terakhir
  };

  if (snap.exists()) {
    // Merge true memastikan field lain tidak terhapus saat melakukan update
    await setDoc(ref, payload, { merge: true });
  } else {
    // Membuat dokumen baru jika sebelumnya belum ada dokumen global settings
    await setDoc(ref, payload);
  }
}

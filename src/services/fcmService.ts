// src/services/fcmService.ts
import { messaging, db } from "../lib/firebase";
import { getToken, onMessage } from "firebase/messaging";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

/**
     * Service untuk mengelola Firebase Cloud Messaging (FCM).
     * Digunakan untuk registrasi token push notification agar server dapat mengirim notifikasi langsung ke browser/HP.
     */
export const fcmService = {
    /**
     * Mengambil token FCM dari Google, lalu menyimpannya ke Firestore pada koleksi `fcm_tokens` berdasarkan User ID.
     * 
     * @param userId - UID milik user yang sedang aktif login.
     * @param vapidKey - Kunci VAPID unik dari console Firebase Anda untuk otentikasi browser.
     */
    async registerToken(userId: string, vapidKey: string) {
        // Jika inisialisasi FCM Messaging gagal/tidak didukung oleh browser, hentikan proses
        if (!messaging) {
            return;
        }

        try {
            // PWA Push Notification mensyaratkan berjalannya Service Worker di browser
            if (!("serviceWorker" in navigator)) {
                return;
            }

            // Menunggu service worker terdaftar dan siap digunakan
            const registration = await navigator.serviceWorker.ready;

            // Meminta token FCM unik untuk perangkat browser ini
            const token = await getToken(messaging, {
                vapidKey,
                serviceWorkerRegistration: registration
            });

            // Jika token berhasil didapatkan, simpan/update ke Firestore agar server tahu tujuan notifikasi
            if (token) {
                await setDoc(doc(db, "fcm_tokens", userId), {
                    token,
                    updatedAt: serverTimestamp(),
                    platform: "web",
                });
                return token;
            }
        } catch (err: any) {
            // Tetap melakukan log error krusial untuk kebutuhan debug PWA
            console.error("[fcmService] Error saat mengambil token FCM:", err);
        }
    },

    /**
     * Listener untuk mendengarkan pesan push yang datang ketika aplikasi dalam keadaan terbuka (Foreground / Latar Depan).
     * 
     * @param callback - Fungsi yang menangani data payload dari pesan FCM yang masuk.
     */
    onForegroundMessage(callback: (payload: any) => void) {
        if (!messaging) return;
        return onMessage(messaging, (payload) => {
            console.log("[FCM] Pesan diterima saat aplikasi aktif (Foreground):", payload);
            callback(payload);
        });
    }
};

// src/services/notificationService.ts
/**
 * Service untuk mengelola izin notifikasi browser (Web Notifications API) dan menampilkan notifikasi lokal.
 * Berguna untuk mengirim pengingat instan kepada admin terkait pesanan belum bayar dsb.
 */

export const notificationService = {
    /**
     * Meminta izin (permission request) kepada pengguna untuk menampilkan notifikasi di layar browser/HP.
     * Mengembalikan salah satu status: 'granted' (diizinkan), 'denied' (ditolak), atau 'default' (ditutup tanpa memilih).
     */
    async requestPermission(): Promise<NotificationPermission> {
        console.log("[NotificationService] Meminta izin notifikasi...");

        // Mengecek apakah browser mendukung Web Notification API
        if (!("Notification" in window)) {
            console.warn("[NotificationService] Browser tidak mendukung fitur notifikasi");
            return "denied";
        }

        // Jika izin sudah pernah diberikan sebelumnya, kembalikan langsung status 'granted'
        if (Notification.permission === "granted") {
            console.log("[NotificationService] Izin notifikasi sudah aktif");
            return "granted";
        }

        try {
            // Meminta izin lewat dialog modal browser
            const permission = await Notification.requestPermission();
            console.log("[NotificationService] Keputusan izin dari pengguna:", permission);
            return permission;
        } catch (error) {
            console.error("[NotificationService] Gagal meminta izin notifikasi:", error);
            return "denied";
        }
    },

    /**
     * Mengecek apakah status notifikasi saat ini diizinkan oleh pengguna.
     */
    isPermissionGranted(): boolean {
        return "Notification" in window && Notification.permission === "granted";
    },

    /**
     * Menampilkan notifikasi lokal di perangkat pengguna.
     * Mencoba menampilkan lewat Service Worker (untuk PWA) agar didukung background state, 
     * jika gagal maka akan menggunakan standard browser Notification API.
     * 
     * @param title - Judul utama notifikasi.
     * @param options - Konfigurasi tambahan seperti isi pesan (body), tag penumpukan, getaran, dll.
     */
    async showLocalNotification(title: string, options?: NotificationOptions) {
        if (!this.isPermissionGranted()) {
            return;
        }

        // Konfigurasi visual notifikasi menggunakan ikon logo PWA
        const notificationOptions: any = {
            icon: "/pwa-192x192.png",
            badge: "/pwa-192x192.png",
            vibrate: [100, 50, 100], // Pola getaran perangkat [getar, jeda, getar]
            body: options?.body,
            tag: options?.tag, // Menggunakan tag sejenis agar notifikasi baru menimpa notifikasi lama (tidak spam)
            ...options,
        };

        try {
            // Metode 1: Menampilkan lewat Service Worker (Standar untuk PWA / Android Chrome)
            if ("serviceWorker" in navigator) {
                const registration = await navigator.serviceWorker.ready;
                if (registration) {
                    await registration.showNotification(title, notificationOptions);
                    return;
                }
            }

            // Metode 2: Standard Notification API (Fallback untuk browser desktop biasa)
            new Notification(title, notificationOptions);
        } catch (error) {
            console.error("[NotificationService] Gagal menampilkan notifikasi standard:", error);

            // Metode 3: Kirim message ke Service Worker Controller (Fallback jika ada restriksi sandboxing)
            if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
                navigator.serviceWorker.controller.postMessage({
                    type: "SHOW_NOTIFICATION",
                    payload: { title, options: notificationOptions },
                });
            }
        }
    },

    /**
     * Memeriksa data order aktif dan mengirim notifikasi jika terdapat pesanan yang belum lunas.
     * Dipanggil pada dashboard untuk pengingat admin.
     * 
     * @param orders - Array daftar pesanan.
     */
    checkAndNotifyOrders(orders: any[]) {
        // Cari order yang statusnya "Belum Membayar" atau "Pending"
        const pendingOrders = orders.filter(o => o.status === "Pending" || o.status === "Belum Membayar");

        // Kirim notifikasi lokal jika ditemukan order yang belum membayar
        if (pendingOrders.length > 0) {
            this.showLocalNotification("Pesanan Butuh Perhatian", {
                body: `Ada ${pendingOrders.length} pesanan yang masih pending / belum dibayar.`,
                tag: "pending-orders",
            });
        }
    }
};

# Aturan akses Buku Kas

`ledger.rules` adalah fragmen untuk digabungkan ke rules proyek yang sudah ada, **bukan pengganti seluruh rules**. Repository ini tidak menyimpan rules produksi maupun konfigurasi deployment Firebase. Perubahan lokal ini belum mengubah rules atau data produksi.

## Sebelum mengaktifkan laporan publik

1. Salin rules produksi yang aktif dan gabungkan helper serta match di `ledger.rules` ke blok `/databases/{database}/documents`. Pertahankan rules fitur lain.
2. Buat `ledger_admins/<UID Firebase Auth>` dengan `{ active: true }` untuk setiap anggota tim yang memang boleh mengelola kas, melalui Firebase Console atau Admin SDK. Jangan memberikan izin client untuk membuat/mengubah allowlist ini.
3. Hapus/persempit izin umum yang tumpang tindih dengan koleksi kas. Pada Firestore, seluruh `allow` yang cocok digabung dengan OR; blok `allow: false` tidak membatalkan izin dari wildcard lain. Pastikan pengguna tanpa izin tidak dapat membaca `ledger`, `capitalAdvances`, `metadata/ledger_summary`, `ledger_audit`, atau melakukan list `ledger_reports`.
4. Uji rules gabungan dengan Firebase Emulator/rules playground: admin yang ada di allowlist dapat bekerja, pengguna lain ditolak, laporan bertoken aktif hanya bisa `get` satu dokumen, token invalid/kedaluwarsa/dicabut ditolak, penerima tidak bisa membuat/mengubah/menghapus laporan, snapshot tidak dapat diperluas, dan audit tidak bisa diubah/dihapus.
5. Deploy rules gabungan ke proyek Firebase yang tepat. Baru kemudian set `VITE_ENABLE_PUBLIC_LEDGER_REPORTS=true` dan build/deploy aplikasi.

Tanpa flag tersebut, halaman laporan tidak membaca Firestore dan tombol pembuatan link tidak aktif. Link lama `?share_ledger=true` / `?share_ledger=1` selalu ditolak. Guard frontend ini tidak dapat memperbaiki rules produksi yang masih memberi izin baca global; langkah rules di atas tetap diperlukan.

## Perilaku data

- Laporan publik membaca satu dokumen `ledger_reports/<48 karakter heksadesimal acak>`. Isinya salinan tanggal, tipe, kategori, keterangan, dan nominal sesuai filter saat dibuat, dengan pilihan kedaluwarsa 1/7/30 hari. Catatan internal, rekening, saldo global, dan riwayat admin tidak disalin.
- Penerima tidak bisa memperluas cakupan dengan mengganti query tanggal/kategori pada URL. Perubahan kas sesudah link dibuat tidak mengubah salinan lama; buat laporan baru untuk versi terbaru.
- Pencabutan bersifat permanen. File Excel/salinan yang sudah diunduh penerima tidak dapat ditarik kembali.
- Pembatalan transaksi menyimpan `voidedAt` dan mengeluarkannya dari saldo. Pemulihan melalui Riwayat mengembalikannya ke saldo. Audit mencatat aktor, waktu, dan data sebelum/sesudah secara atomik. Riwayat baru tersedia sejak fitur ini digunakan; aktivitas lama tidak direkonstruksi.
- Saldo ditampilkan untuk keseluruhan kas. Form dan ekspor mencatat metode pembayaran tanpa kolom rekening.
- Hubungan modal lama dicari melalui `ledgerEntryIdKeluar` / `ledgerEntryIdMasuk` dan dilengkapi saat diperbarui. Modal yatim atau nominal yang sudah tidak cocok ditolak saat pengembalian; tidak dibuatkan pemasukan otomatis. Selaraskan transaksi asal melalui edit setelah memeriksa catatan yang benar.
- Pengembalian sebagian menyimpan `returnedAmount`. Membatalkan pengembalian membuka kembali sisa modal. Modal tidak bisa dibatalkan selama masih ada pengembalian aktif, kecuali seluruh pengembalian itu ikut dipilih dalam satu batch.
- Pembatalan massal maksimal 100 transaksi dan seluruhnya atomik. Pilihan dibersihkan saat filter berubah. Laporan/grafik/ekspor memakai seluruh transaksi aktif sesuai filter; batas 50 hanya mengatur jumlah baris yang dirender.
- Halaman admin berlangganan seluruh ledger untuk menjamin total dan ekspor lengkap. Untuk volume sangat besar, pindahkan agregasi/laporan ke backend sebelum memperkenalkan kembali pagination server.

## Verifikasi lokal

`node --test tests/ledger-*.test.mjs` menjalankan modul layanan asli dengan penyimpanan Firestore dalam memori yang memodelkan transaksi, konflik baca, dan retry. Tes ini memeriksa integritas data, bukan enforcement rules Firestore. Pengujian emulator/rules gabungan tetap diperlukan sebelum aktivasi publik.

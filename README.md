# 🛠️ Jastip Admin (NihongTeam)

Admin dashboard untuk aplikasi _Jastip_ (Jasa Titip).\
Proyek ini dibuat untuk mempermudah pengelolaan data, pesanan, dan
pengguna oleh tim admin.

---

## 🚀 Fitur Utama

### 📊 Dashboard

- Ringkasan statistik pesanan
- Monitoring performa
- Summary pengguna

### 📦 Manajemen Produk

- Tambah / edit / hapus produk
- Upload gambar
- Kategori produk

### 🧑‍💼 Manajemen Pengguna

- Daftar admin
- Pengaturan role & hak akses

### 📝 Manajemen Pesanan

- Lihat pesanan masuk
- Update status pesanan

### ⚙️ Pengaturan

- Update profil admin
- Konfigurasi sistem

---

## 📁 Struktur Folder

    /
    ├─ src/
    │   ├─ components/
    │   ├─ pages/
    │   ├─ services/
    │   ├─ assets/
    │   └─ App.js
    ├─ public/
    ├─ .env
    ├─ package.json
    └─ README.md

---

## 🔧 Teknologi

- React / Next.js / Vite
- TailwindCSS / CSS Modules
- Axios / Fetch API
- Vercel Deployment

---

## 📦 Instalasi

```bash
git clone https://github.com/username/jastip-admin.git
cd nihong-jastip
npm install
npm run dev
```

---

## 🚀 Deployment

Siap deploy ke: - Vercel - Render

Untuk memastikan link publik selalu memakai domain deployment meskipun admin
membuka aplikasi dari server lokal, isi environment variable berikut:

```bash
VITE_PUBLIC_APP_URL=https://domain-aplikasi.example
```

Jika tidak diisi, aplikasi memakai origin halaman yang sedang dibuka. Origin
`localhost` dan loopback otomatis dinormalisasi ke HTTP agar sesuai dengan
server development Vite.

---

## 📜 License

MIT License © 2025 NihongTeam

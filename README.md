# 🏢 Portal Digital Pesantren (Kantin & Bendahara)

Aplikasi web berbasis Single Page Application (SPA) yang dirancang untuk mengelola sistem kantin digital santri, top-up saldo, pendaftaran kartu RFID, serta dashboard pencatatan keuangan secara *real-time* menggunakan **Supabase**.

Aplikasi ini diubah dari versi Streamlit (Python) menjadi murni **HTML, CSS, dan JavaScript** agar ringan dan dapat di-hosting secara gratis di web biasa (seperti GitHub Pages, Netlify, atau Vercel) tanpa memerlukan server Python yang berjalan terus-menerus.

---

## 🚀 Fitur Utama
1. **🏪 Kantin Digital (Jajan):** 
   - Scan/input ID Kartu RFID santri untuk melihat saldo secara instan.
   - Verifikasi PIN santri dan proses pembayaran jajan secara aman.
   - Validasi saldo mencukupi dan otomatis memotong saldo di database.
2. **🧮 Portal Bendahara:**
   - Halaman login admin yang dilindungi kunci pengaman.
   - **Top-Up Saldo:** Pengisian saldo tabungan santri (Tunai).
   - **Pendaftaran Santri Baru:** Mendaftarkan kartu RFID baru lengkap dengan nama, kelas, kamar, PIN, dan limit harian.
   - **Cek Saldo:** Menu cepat untuk memeriksa saldo santri.
3. **💰 Dashboard Pemasukan:**
   - Rekapitulasi total pemasukan dari Top-Up dan Jajan Kantin.
   - Tabel riwayat transaksi lengkap dengan filter waktu dan status.

---

## 🛠️ Persiapan & Instalasi

Karena ini adalah aplikasi web statis (front-end murni), Anda tidak memerlukan instalasi Node.js atau Python di server hosting. Cukup ikuti langkah berikut:

1. **Clone atau Unduh Repository**
   Pastikan Anda memiliki tiga file utama di dalam satu folder:
   - `index.html` (Tampilan antarmuka & navigasi tab)
   - `style.css` (Desain dan tata letak responsif untuk HP/Komputer)
   - `script.js` (Logika aplikasi dan koneksi Supabase)

2. **Konfigurasi Supabase**
   - Buka file `script.js`.
   - Cari baris konfigurasi Supabase di bagian paling atas:
     ```javascript
     const SUPABASE_URL = "MASUKKAN_SUPABASE_URL_ANDA_DI_SINI";
     const SUPABASE_KEY = "MASUKKAN_SUPABASE_ANON_KEY_ANDA_DI_SINI";
     ```
   - Ganti dengan `SUPABASE_URL` dan `SUPABASE_ANON_KEY` yang diambil dari dashboard proyek Supabase Anda (menu *Settings > API*).

3. **Konfigurasi Kunci Admin & Password**
   - Di dalam file `script.js`, Anda bisa mengubah kunci akses admin dan password bendahara sesuai keinginan pada fungsi `loginAdmin()` dan `loginPemasukan()` (secara default diset `kunci-rahasia-anda` atau `admin123`).

---

## 🌐 Cara Hosting ke Web Biasa

Anda bisa langsung mengunggah folder proyek ini ke layanan hosting statis gratis berikut:
* **GitHub Pages:** Unggah file ke repository GitHub, lalu aktifkan GitHub Pages di menu *Settings > Pages*.
* **Netlify / Vercel:** Cukup *drag and drop* folder proyek Anda langsung ke dashboard Netlify/Vercel, dan website akan langsung aktif dalam hitungan detik.

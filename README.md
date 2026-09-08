# Kantin Digital Pesantren — versi HTML/CSS/JS/PHP

Port dari aplikasi Streamlit + Supabase menjadi tumpukan web klasik: **HTML**
untuk struktur, **CSS** untuk tampilan, **JavaScript** untuk interaksi (AJAX),
dan **PHP + MySQL/MariaDB** sebagai backend.

## Struktur file

```
kantin-digital/
├── index.php                  # Halaman utama (form transaksi)
├── style.css                  # Tampilan kios (tema hijau tua & emas)
├── script.js                  # Cek kartu live + submit transaksi via AJAX
├── config.php                 # Koneksi DB + semua fungsi helper (PDO)
├── database.sql               # Skema tabel Data_Santri & Log_Transaksi
└── api/
    ├── get_card_info.php      # GET  -> info kartu (saldo, limit) saat ditap
    └── process_transaction.php# POST -> proses transaksi jajan
```

## Pemetaan fungsi Python -> PHP

| Python (Streamlit)         | PHP                                   |
|-----------------------------|----------------------------------------|
| `ambil_data_santri()`       | `ambil_data_santri()` di `config.php`  |
| `total_jajan_hari_ini()`    | `total_jajan_hari_ini()`               |
| `ambil_info_kartu()`        | `ambil_info_kartu()`                   |
| `catat_log()`               | `catat_log()`                          |
| `proses_jajan()`            | `proses_jajan()`                       |
| `sudah_diproses_baru_saja()`| `sudah_diproses_baru_saja()` (pakai PHP session, bukan `st.session_state`) |
| `st.text_input` kartu di luar form (auto tampil info) | `#uid_kartu` di luar `<form>`, dipantau JS dan fetch ke `api/get_card_info.php` |
| Form nominal + PIN di dalam `st.form` | `<form id="form-transaksi">`, hanya kirim data saat submit |
| Anti-autofill via `components.html` + JS | Atribut `autocomplete="new-password"`, `data-lpignore`, dll langsung di HTML |
| `st.balloons()` | Efek konfeti CSS/JS sederhana di `#konfeti` |

## Cara pakai

1. Buat database dan tabel: jalankan `database.sql` di MySQL/MariaDB.
   ```
   mysql -u root -p < database.sql
   ```
2. Sesuaikan kredensial database di bagian atas `config.php`
   (`DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASS`).
3. Letakkan seluruh folder `kantin-digital/` di web server yang mendukung
   PHP 8+ (mis. Apache/Nginx + PHP-FPM, atau untuk uji coba lokal cukup
   jalankan):
   ```
   php -S localhost:8000
   ```
   lalu buka `http://localhost:8000/index.php`.
4. Tambahkan data santri percobaan (contoh ada di komentar bawah
   `database.sql`) supaya kartu bisa dites.

## Alur kerja

1. **Tap kartu** — operator klik kotak "ID Kartu", tempelkan kartu RFID.
   JS mengirim UID ke `api/get_card_info.php` (GET, read-only) dan
   menampilkan nama, saldo, serta sisa limit harian secara otomatis.
   Tahap ini **tidak** memotong saldo apa pun, sama seperti versi Python.
2. **Isi nominal & PIN**, lalu tekan **"PROSES TRANSAKSI JAJAN"**.
   Baru pada langkah ini `script.js` mengirim `POST` ke
   `api/process_transaction.php`, yang menjalankan validasi PIN, saldo,
   dan limit harian persis seperti fungsi `proses_jajan()` di Python,
   lalu memperbarui saldo dan mencatat ke `Log_Transaksi`.
3. **Cegah dobel-submit** — server menyimpan tanda tangan transaksi
   terakhir (UID + nominal + PIN) di PHP session selama 5 detik; kalau
   transaksi identik datang lagi dalam jeda itu, ditolak dengan status
   `"dobel"` tanpa memotong saldo dua kali.

## Catatan keamanan

- PIN dikirim melalui `POST` biasa; untuk produksi, jalankan aplikasi ini
  di atas **HTTPS** supaya PIN tidak terkirim polos di jaringan.
- Simpan PIN dalam bentuk hash (mis. `password_hash()`) jika database ini
  bisa diakses banyak pihak — kode saat ini mengikuti pendekatan Python
  aslinya yang membandingkan PIN sebagai angka biasa.
- Batasi akses ke `config.php` (taruh di luar web root bila memungkinkan)
  karena berisi kredensial database.

<?php
declare(strict_types=1);
require_once __DIR__ . '/config.php';
?>
<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Kantin Digital Pesantren</title>
<link rel="stylesheet" href="style.css">
</head>
<body>

<main class="kartu-utama">
    <header class="kepala">
        <span class="ikon-toko" aria-hidden="true">🏪</span>
        <h1>Kantin Digital Pesantren</h1>
        <p class="sub-judul">Silakan masukkan data transaksi di bawah ini dengan benar.</p>
    </header>

    <hr>

    <!-- ================================================
         STEP 1: TAP KARTU
         Ini cuma menampilkan info saldo & limit begitu
         kartu ditap — BUKAN proses transaksi.
    ================================================= -->
    <section class="langkah" id="langkah-kartu">
        <label for="uid_kartu">1. Silakan TEMPELKAN KARTU RFID Santri pada reader...</label>
        <input
            type="text"
            id="uid_kartu"
            name="uid_kartu"
            placeholder="Menunggu kartu..."
            autocomplete="new-password"
            autocorrect="off"
            autocapitalize="off"
            spellcheck="false"
            data-lpignore="true"
            data-form-type="other"
        >
        <p class="petunjuk">Klik kotak ini sebelum menempelkan kartu.</p>

        <div id="info-kartu" class="kotak-info kotak-info--tersembunyi" role="status" aria-live="polite"></div>
    </section>

    <!-- ================================================
         STEP 2 & 3: NOMINAL & PIN
         Dikirim ke server HANYA saat tombol submit ditekan.
    ================================================= -->
    <form id="form-transaksi" autocomplete="off" novalidate>
        <section class="langkah">
            <label for="nominal">2. Masukkan Nominal Belanja (Rp)</label>
            <input type="number" id="nominal" name="nominal" min="0" step="500" value="0" inputmode="numeric">
        </section>

        <section class="langkah">
            <label for="pin">3. Masukkan PIN Santri (4-6 Digit)</label>
            <input
                type="password"
                id="pin"
                name="pin"
                placeholder="Ketik PIN di sini"
                autocomplete="new-password"
                autocorrect="off"
                autocapitalize="off"
                spellcheck="false"
                data-lpignore="true"
                data-form-type="other"
                maxlength="6"
                inputmode="numeric"
            >
        </section>

        <button type="submit" id="tombol-proses" class="tombol-proses">
            PROSES TRANSAKSI JAJAN 💳
        </button>
    </form>

    <!-- Area hasil transaksi (sukses / gagal / dobel-submit) -->
    <div id="hasil-transaksi" aria-live="polite"></div>
</main>

<div id="konfeti" aria-hidden="true"></div>

<script src="script.js"></script>
</body>
</html>

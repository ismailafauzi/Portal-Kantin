/* ======================================================
   KANTIN DIGITAL PESANTREN — script.js
   Port dari perilaku Streamlit:
   - STEP 1 (tap kartu) -> tampil info otomatis, read-only, live search.
   - STEP 2 & 3 (nominal + PIN) -> dikirim HANYA saat tombol ditekan.
   - Anti dobel-submit ditangani juga di sisi server (lihat config.php),
     ini cuma menonaktifkan tombol sebentar sebagai lapisan tambahan.
   ====================================================== */

(function () {
    "use strict";

    const inputUid = document.getElementById("uid_kartu");
    const kotakInfo = document.getElementById("info-kartu");
    const form = document.getElementById("form-transaksi");
    const inputNominal = document.getElementById("nominal");
    const inputPin = document.getElementById("pin");
    const tombolProses = document.getElementById("tombol-proses");
    const hasilTransaksi = document.getElementById("hasil-transaksi");

    let timerDebounceUid = null;

    function formatRp(angka) {
        const n = Number(angka) || 0;
        return "Rp " + n.toLocaleString("en-US");
    }

    // --------------------------------------------------
    // STEP 1: cek kartu (read-only, hanya menampilkan info)
    // --------------------------------------------------
    function tampilkanInfoKartu(data) {
        kotakInfo.classList.remove("kotak-info--tersembunyi", "kotak-info--peringatan");

        if (!data.found) {
            kotakInfo.classList.add("kotak-info--peringatan");
            kotakInfo.innerHTML = "⚠ " + escapeHtml(data.message || "Kartu belum terdaftar di database!");
            return;
        }

        let pesanLimit;
        if (data.limit_harian) {
            pesanLimit =
                "<strong>Limit Harian:</strong> " + formatRp(data.limit_harian) +
                " | <strong>Sudah Dipakai Hari Ini:</strong> " + formatRp(data.sudah_dipakai) +
                " | <strong>Sisa Limit Hari Ini:</strong> " + formatRp(data.sisa_limit);
        } else {
            pesanLimit = "Kartu ini tidak memiliki batas limit jajan harian.";
        }

        kotakInfo.innerHTML =
            "<strong>Kartu Terdeteksi:</strong> " + escapeHtml(data.nama) + "<br>" +
            "<strong>Saldo Saat Ini:</strong> " + formatRp(data.saldo) + "<br>" +
            pesanLimit;
    }

    function cekKartu() {
        const uid = inputUid.value.trim();
        if (!uid) {
            kotakInfo.classList.add("kotak-info--tersembunyi");
            kotakInfo.innerHTML = "";
            return;
        }

        fetch("api/get_card_info.php?uid=" + encodeURIComponent(uid))
            .then((res) => res.json())
            .then(tampilkanInfoKartu)
            .catch(() => {
                kotakInfo.classList.remove("kotak-info--tersembunyi");
                kotakInfo.classList.add("kotak-info--peringatan");
                kotakInfo.innerHTML = "⚠ Tidak dapat terhubung ke server. Periksa koneksi lalu coba lagi.";
            });
    }

    // Reader RFID biasanya mengetik cepat lalu diam / kirim Enter.
    // Debounce di 'input' menangkap kedua kasus tanpa perlu tombol.
    inputUid.addEventListener("input", function () {
        clearTimeout(timerDebounceUid);
        timerDebounceUid = setTimeout(cekKartu, 350);
    });
    inputUid.addEventListener("keydown", function (e) {
        if (e.key === "Enter") {
            e.preventDefault();
            clearTimeout(timerDebounceUid);
            cekKartu();
        }
    });

    // --------------------------------------------------
    // STEP 2 & 3: submit transaksi (hanya jalan saat tombol ditekan)
    // --------------------------------------------------
    function tampilkanHasil(html, jenis) {
        hasilTransaksi.innerHTML = '<div class="pesan pesan--' + jenis + '">' + html + "</div>";
    }

    function tembakKonfeti() {
        const wadah = document.getElementById("konfeti");
        const warna = ["#B8862E", "#1F5750", "#D9A63C", "#285C33", "#EFE8D6"];
        for (let i = 0; i < 60; i++) {
            const partikel = document.createElement("div");
            partikel.className = "konfeti-partikel";
            partikel.style.left = Math.random() * 100 + "vw";
            partikel.style.background = warna[i % warna.length];
            partikel.style.animationDelay = (Math.random() * 0.4) + "s";
            partikel.style.animationDuration = (2000 + Math.random() * 900) + "ms";
            wadah.appendChild(partikel);
            setTimeout(() => partikel.remove(), 3500);
        }
    }

    form.addEventListener("submit", function (e) {
        e.preventDefault();

        const uid = inputUid.value.trim();
        const nominal = parseInt(inputNominal.value, 10) || 0;
        const pin = inputPin.value.trim();

        // Validasi dasar di sisi klien (validasi final tetap di server)
        if (!uid) {
            tampilkanHasil("❌ Kartu belum terdeteksi. Silakan tempelkan kartu lalu tekan tombol lagi.", "gagal");
            return;
        }
        if (nominal <= 0) {
            tampilkanHasil("❌ Nominal belanja harus lebih dari Rp 0!", "gagal");
            return;
        }
        if (!pin) {
            tampilkanHasil("❌ PIN santri wajib diisi!", "gagal");
            return;
        }

        tombolProses.disabled = true;
        tombolProses.textContent = "Sedang memproses transaksi...";

        const formData = new URLSearchParams();
        formData.set("uid_kartu", uid);
        formData.set("nominal", String(nominal));
        formData.set("pin", pin);

        fetch("api/process_transaction.php", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: formData.toString(),
        })
            .then((res) => res.json())
            .then((hasil) => {
                if (hasil.status === "success") {
                    let pesanLimit = "";
                    if (hasil.sisa_limit !== null && hasil.sisa_limit !== undefined) {
                        pesanLimit = "<br><strong>Sisa Limit Jajan Hari Ini:</strong> " + formatRp(hasil.sisa_limit);
                    }
                    tampilkanHasil(
                        "<strong>✅ TRANSAKSI BERHASIL!</strong>" +
                        "Nama Santri: " + escapeHtml(hasil.nama) + "<br>" +
                        "Sisa Saldo Terbaru: " + formatRp(hasil.sisa_saldo) +
                        pesanLimit,
                        "sukses"
                    );
                    tembakKonfeti();
                    inputPin.value = "";
                    cekKartu(); // refresh info kartu (saldo & limit terbaru)
                } else if (hasil.status === "dobel") {
                    tampilkanHasil("⏱ " + escapeHtml(hasil.message), "peringatan");
                } else {
                    tampilkanHasil("<strong>❌ TRANSAKSI GAGAL</strong>" + escapeHtml(hasil.message), "gagal");
                }
            })
            .catch(() => {
                tampilkanHasil("⚠ Terjadi kesalahan koneksi atau sistem. Silakan coba lagi.", "gagal");
            })
            .finally(() => {
                tombolProses.disabled = false;
                tombolProses.textContent = "PROSES TRANSAKSI JAJAN 💳";
            });
    });

    function escapeHtml(teks) {
        const div = document.createElement("div");
        div.textContent = String(teks ?? "");
        return div.innerHTML;
    }

    // Fokus otomatis ke kotak UID saat halaman dibuka, siap menerima tap kartu
    inputUid.focus();
})();

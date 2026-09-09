// ======================================================
// KONFIGURASI SUPABASE (Ganti dengan kunci proyek Anda)
// ======================================================
const SUPABASE_URL = "https://ijipnnhgbzwatdzbdlek.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlqaXBubmhnYnp3YXRkemJkbGVrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgzMjc3NDIsImV4cCI6MjEwMzkwMzc0Mn0.TviHZ5O25ZSif9DawhcywKD9c3d4bv3yGnLPGk6iMAU";

// Inisialisasi Klien Supabase
const { createClient } = supabase;
const _supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const TABLE_SANTRI = "Data_Santri";
const TABLE_LOG = "Log_Transaksi";
const LIMIT_DEFAULT = 20000;

// ======================================================
// UTILITAS
// ======================================================
function formatRupiah(n) {
    return "Rp " + (Number(n) || 0).toLocaleString("id-ID");
}

// Menghitung total jajan hari ini + sisa limit untuk seorang santri
async function hitungStatusHarian(santri) {
    let limitHarian = santri["Limit Harian"] !== undefined && santri["Limit Harian"] !== null
        ? santri["Limit Harian"]
        : LIMIT_DEFAULT;

    let todayStr = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    let { data: logsHariIni } = await _supabase
        .from(TABLE_LOG)
        .select("*")
        .eq("ID", santri.ID)
        .ilike("Status", "%Jajan%")
        .gte("Waktu", todayStr + "T00:00:00");

    let sudahJajan = 0;
    if (logsHariIni) {
        logsHariIni.forEach(log => {
            sudahJajan += parseInt(log.Nominal) || 0;
        });
    }

    let sisaLimit = limitHarian - sudahJajan;
    return { limitHarian, sudahJajan, sisaLimit: sisaLimit < 0 ? 0 : sisaLimit };
}

// Menampilkan kartu status (dipakai saat kartu terdeteksi & saat transaksi diproses)
function tampilkanKartuStatus(santri, status, badgeText) {
    let box = document.getElementById("kantin-info-kartu");
    box.style.display = "block";
    document.getElementById("stat-nama").innerText = santri.Nama;
    document.getElementById("stat-badge").innerText = badgeText || "Terdeteksi";
    document.getElementById("stat-saldo").innerText = formatRupiah(santri.Saldo);
    document.getElementById("stat-sudah-jajan").innerText = formatRupiah(status.sudahJajan);
    document.getElementById("stat-sisa-limit").innerText = formatRupiah(status.sisaLimit);
    document.getElementById("stat-limit-total").innerText = formatRupiah(status.limitHarian);

    let persen = status.limitHarian > 0 ? Math.min(100, (status.sudahJajan / status.limitHarian) * 100) : 0;
    document.getElementById("limit-bar-fill").style.width = persen + "%";
}

function sembunyikanKartuStatus() {
    document.getElementById("kantin-info-kartu").style.display = "none";
}

// ======================================================
// FUNGSI KONTROL SIDEBAR TERSEMBUNYI
// ======================================================
function toggleSidebar() {
    let sidebar = document.getElementById("app-sidebar");
    let overlay = document.getElementById("sidebar-overlay");
    sidebar.classList.toggle("active");
    overlay.classList.toggle("active");
}

// ======================================================
// NAVIGASI ANTAR TAB
// ======================================================
function switchTab(evt, tabName) {
    let contents = document.getElementsByClassName("tab-content");
    for (let c of contents) c.classList.remove("active");

    let buttons = document.getElementsByClassName("tab-btn");
    for (let b of buttons) b.classList.remove("active");

    document.getElementById(tabName).classList.add("active");
    evt.currentTarget.classList.add("active");

    if (window.innerWidth <= 768) {
        toggleSidebar();
    }
}

function switchSubTab(evt, subTabName) {
    let contents = document.getElementsByClassName("sub-content");
    for (let c of contents) c.classList.remove("active");

    let buttons = document.getElementsByClassName("sub-tab-btn");
    for (let b of buttons) b.classList.remove("active");

    document.getElementById(subTabName).classList.add("active");
    evt.currentTarget.classList.add("active");
}

// ======================================================
// BALON-BALON TERBANG SAAT TRANSAKSI BERHASIL
// ======================================================
function terbangkanBalon() {
    let layer = document.getElementById("balloon-layer");
    let emoji = ["🎈", "🎈", "🎈", "🎉", "✨"];
    let jumlah = 16;

    for (let i = 0; i < jumlah; i++) {
        let b = document.createElement("span");
        b.className = "balloon";
        b.textContent = emoji[Math.floor(Math.random() * emoji.length)];

        let left = Math.random() * 100;
        let size = 24 + Math.random() * 26;
        let duration = 2.6 + Math.random() * 1.8;
        let delay = Math.random() * 0.5;
        let drift = (Math.random() * 160 - 80) + "px";
        let spin = (Math.random() * 50 - 25) + "deg";

        b.style.left = left + "vw";
        b.style.fontSize = size + "px";
        b.style.animationDuration = duration + "s";
        b.style.animationDelay = delay + "s";
        b.style.setProperty("--drift", drift);
        b.style.setProperty("--spin", spin);

        layer.appendChild(b);
        setTimeout(() => b.remove(), (duration + delay) * 1000 + 200);
    }
}

// ======================================================
// 1. KANTIN DIGITAL (JAJAN & LIMIT HARIAN)
// ======================================================
document.getElementById("kantin-uid").addEventListener("input", async function() {
    let uid = this.value.trim();
    if (uid.length < 3) {
        sembunyikanKartuStatus();
        return;
    }

    let { data: santri } = await _supabase.from(TABLE_SANTRI).select("*").eq("UID", uid).single();
    if (santri) {
        let status = await hitungStatusHarian(santri);
        tampilkanKartuStatus(santri, status, "Terdeteksi");
    } else {
        sembunyikanKartuStatus();
    }
});

async function prosesJajan() {
    let uid = document.getElementById("kantin-uid").value.trim();
    let nominal = parseInt(document.getElementById("kantin-nominal").value);
    let pin = document.getElementById("kantin-pin").value.trim();
    let resultDiv = document.getElementById("kantin-result");

    if (!uid || !(nominal > 0) || !pin) {
        resultDiv.style.color = "#B23A2E";
        resultDiv.innerText = "❌ Harap isi UID, nominal (> 0), dan PIN dengan benar!";
        return;
    }

    let { data: santri } = await _supabase.from(TABLE_SANTRI).select("*").eq("UID", uid).single();
    if (!santri) {
        resultDiv.style.color = "#B23A2E";
        resultDiv.innerText = "❌ Kartu belum terdaftar di database!";
        return;
    }

    if (parseInt(pin) !== parseInt(santri.Pin)) {
        resultDiv.style.color = "#B23A2E";
        resultDiv.innerText = "❌ PIN salah! Silakan coba lagi.";
        return;
    }

    if (nominal > santri.Saldo) {
        resultDiv.style.color = "#B23A2E";
        resultDiv.innerText = `❌ Saldo tidak cukup. Saldo saat ini: ${formatRupiah(santri.Saldo)}`;
        return;
    }

    // Hitung status limit harian sebelum transaksi & tampilkan kartu "Diproses"
    let status = await hitungStatusHarian(santri);
    tampilkanKartuStatus(santri, status, "Diproses…");

    if (nominal > status.sisaLimit) {
        resultDiv.style.color = "#B23A2E";
        resultDiv.innerText = `❌ Melebihi limit harian. Sisa limit hari ini: ${formatRupiah(status.sisaLimit)}`;
        return;
    }

    let saldoBaru = santri.Saldo - nominal;
    let { error: updateErr } = await _supabase.from(TABLE_SANTRI).update({ Saldo: saldoBaru }).eq("UID", uid);
    if (updateErr) {
        resultDiv.style.color = "#B23A2E";
        resultDiv.innerText = "❌ Gagal memperbarui saldo di database.";
        return;
    }

    await _supabase.from(TABLE_LOG).insert([{
        Waktu: new Date().toISOString(),
        ID: santri.ID,
        Nama: santri.Nama,
        Nominal: nominal.toString(),
        Status: "Jajan - Berhasil"
    }]);

    let sudahJajanBaru = status.sudahJajan + nominal;
    let sisaLimitBaru = status.limitHarian - sudahJajanBaru;
    if (sisaLimitBaru < 0) sisaLimitBaru = 0;

    // Perbarui kartu status dengan angka terbaru pasca-transaksi
    let santriTerbaru = Object.assign({}, santri, { Saldo: saldoBaru });
    tampilkanKartuStatus(santriTerbaru, { limitHarian: status.limitHarian, sudahJajan: sudahJajanBaru, sisaLimit: sisaLimitBaru }, "Berhasil ✓");

    resultDiv.style.color = "#1E8449";
    resultDiv.innerHTML = `
        ✅ Transaksi berhasil!<br>
        Nama: <b>${santri.Nama}</b><br>
        Sisa saldo: <b>${formatRupiah(saldoBaru)}</b><br>
        Sudah jajan hari ini: <b>${formatRupiah(sudahJajanBaru)}</b><br>
        Sisa limit harian: <b>${formatRupiah(sisaLimitBaru)}</b> (limit: ${formatRupiah(status.limitHarian)})
    `;

    terbangkanBalon();
    tampilkanPopupSukses(santri.Nama, saldoBaru, nominal, sisaLimitBaru);

    document.getElementById("kantin-nominal").value = "0";
    document.getElementById("kantin-pin").value = "";
}

// ======================================================
// 2. PORTAL BENDAHARA & ADMIN
// ======================================================
function loginAdmin() {
    let key = document.getElementById("admin-key").value;
    let res = document.getElementById("login-result");
    if (key === "kunci-rahasia-anda" || key === "admin123") {
        document.getElementById("admin-login-box").style.display = "none";
        document.getElementById("admin-dashboard").style.display = "block";
    } else {
        res.style.color = "#B23A2E";
        res.innerText = "❌ Kunci admin salah!";
    }
}

function logoutAdmin() {
    document.getElementById("admin-login-box").style.display = "block";
    document.getElementById("admin-dashboard").style.display = "none";
    document.getElementById("admin-key").value = "";
}

async function prosesTopUp() {
    let uid = document.getElementById("topup-uid").value.trim();
    let nominal = parseInt(document.getElementById("topup-nominal").value);
    let metode = document.getElementById("topup-metode").value;
    let resDiv = document.getElementById("topup-result");

    if (!uid || !(nominal > 0)) {
        resDiv.style.color = "#B23A2E";
        resDiv.innerText = "❌ UID dan nominal harus diisi!";
        return;
    }

    let { data: santri } = await _supabase.from(TABLE_SANTRI).select("*").eq("UID", uid).single();
    if (!santri) {
        resDiv.style.color = "#B23A2E";
        resDiv.innerText = "❌ Kartu santri tidak ditemukan.";
        return;
    }

    if (metode === "tunai") {
        let saldoBaru = (santri.Saldo || 0) + nominal;
        await _supabase.from(TABLE_SANTRI).update({ Saldo: saldoBaru }).eq("UID", uid);
        await _supabase.from(TABLE_LOG).insert([{
            Waktu: new Date().toISOString(),
            ID: santri.ID,
            Nama: santri.Nama,
            Nominal: nominal.toString(),
            Status: "Top-up Tunai - Berhasil"
        }]);

        resDiv.style.color = "#1E8449";
        resDiv.innerText = `✅ Top-up tunai berhasil! Saldo baru: ${formatRupiah(saldoBaru)}`;
    } else {
        resDiv.style.color = "#A87A1E";
        resDiv.innerText = "ℹ️ Gunakan metode tunai untuk langsung update database frontend.";
    }
}

async function prosesDaftar() {
    let uid = document.getElementById("daftar-uid").value.trim();
    let nama = document.getElementById("daftar-nama").value.trim();
    let kelas = parseInt(document.getElementById("daftar-kelas").value) || 0;
    let kamar = document.getElementById("daftar-kamar").value.trim();
    let pin = document.getElementById("daftar-pin").value.trim();
    let saldoAwal = parseInt(document.getElementById("daftar-saldo").value) || 0;
    let limit = parseInt(document.getElementById("daftar-limit").value) || LIMIT_DEFAULT;
    let resDiv = document.getElementById("daftar-result");

    if (!uid || !nama || !pin) {
        resDiv.style.color = "#B23A2E";
        resDiv.innerText = "❌ Data utama (UID, nama, PIN) wajib diisi!";
        return;
    }

    let { data: existing } = await _supabase.from(TABLE_SANTRI).select("*").eq("UID", uid).single();
    if (existing) {
        resDiv.style.color = "#B23A2E";
        resDiv.innerText = "❌ Kartu RFID sudah terdaftar!";
        return;
    }

    let { data: insertData, error } = await _supabase.from(TABLE_SANTRI).insert([{
        UID: uid,
        Nama: nama,
        Kelas: kelas,
        Kamar: kamar,
        Pin: parseInt(pin),
        Saldo: saldoAwal,
        "Limit Harian": limit
    }]).select();

    if (error) {
        resDiv.style.color = "#B23A2E";
        resDiv.innerText = "❌ Gagal mendaftarkan santri ke database.";
        return;
    }

    if (saldoAwal > 0 && insertData) {
        await _supabase.from(TABLE_LOG).insert([{
            Waktu: new Date().toISOString(),
            ID: insertData[0].ID,
            Nama: nama,
            Nominal: saldoAwal.toString(),
            Status: "Setoran Awal - Pendaftaran"
        }]);
    }

    resDiv.style.color = "#1E8449";
    resDiv.innerText = `🎉 Santri '${nama}' berhasil didaftarkan! (Limit harian: ${formatRupiah(limit)})`;
}

async function prosesCekSaldo() {
    let uid = document.getElementById("cek-uid").value.trim();
    let resDiv = document.getElementById("cek-result");
    let { data: santri } = await _supabase.from(TABLE_SANTRI).select("*").eq("UID", uid).single();

    if (santri) {
        let status = await hitungStatusHarian(santri);
        resDiv.style.color = "#1E8449";
        resDiv.innerHTML = `
            🔍 <b>${santri.Nama}</b><br>
            Saldo: ${formatRupiah(santri.Saldo)}<br>
            Sudah jajan hari ini: ${formatRupiah(status.sudahJajan)}<br>
            Sisa limit harian: ${formatRupiah(status.sisaLimit)} (limit: ${formatRupiah(status.limitHarian)})
        `;
    } else {
        resDiv.style.color = "#B23A2E";
        resDiv.innerText = "❌ Kartu tidak ditemukan.";
    }
}

// ======================================================
// 3. DASHBOARD PEMASUKAN
// ======================================================
function loginPemasukan() {
    let pw = document.getElementById("pemasukan-pw").value;
    let res = document.getElementById("pemasukan-login-result");
    if (pw === "admin123" || pw === "bendahara") {
        document.getElementById("pemasukan-login-box").style.display = "none";
        document.getElementById("pemasukan-dashboard").style.display = "block";
        muatDataPemasukan();
    } else {
        res.style.color = "#B23A2E";
        res.innerText = "❌ Password salah!";
    }
}

function logoutPemasukan() {
    document.getElementById("pemasukan-login-box").style.display = "block";
    document.getElementById("pemasukan-dashboard").style.display = "none";
    document.getElementById("pemasukan-pw").value = "";
}

async function muatDataPemasukan() {
    let { data: logs } = await _supabase.from(TABLE_LOG).select("*").order("Waktu", { ascending: false });
    if (!logs) return;

    let totalTopup = 0;
    let totalJajan = 0;
    let tbody = document.querySelector("#tabel-transaksi tbody");
    tbody.innerHTML = "";

    logs.forEach(row => {
        let nominal = parseInt(row.Nominal) || 0;
        if (row.Status.includes("Top-up") || row.Status.includes("Pendaftaran")) {
            totalTopup += nominal;
        } else if (row.Status.includes("Jajan")) {
            totalJajan += nominal;
        }

        let tr = document.createElement("tr");
        tr.innerHTML = `<td>${new Date(row.Waktu).toLocaleString("id-ID")}</td><td>${row.Nama}</td><td>${formatRupiah(nominal)}</td><td>${row.Status}</td>`;
        tbody.appendChild(tr);
    });

    document.getElementById("metric-topup").innerText = formatRupiah(totalTopup);
    document.getElementById("metric-jajan").innerText = formatRupiah(totalJajan);
}

// ======================================================
// POPUP TRANSAKSI BERHASIL
// ======================================================
function tampilkanPopupSukses(nama, saldoSisa, nominalJajan, sisaLimitBaru) {
    const detailHTML = `
        <b>Nama:</b> ${nama}<br>
        <b>Nominal jajan:</b> ${formatRupiah(nominalJajan)}<br>
        <b>Sisa saldo:</b> ${formatRupiah(saldoSisa)}<br>
        <b>Sisa limit harian:</b> ${formatRupiah(sisaLimitBaru)}
    `;
    document.getElementById("popup-content-detail").innerHTML = detailHTML;
    document.getElementById("popup-balon").style.display = "flex";
}

function tutupPopup() {
    document.getElementById("popup-balon").style.display = "none";
    sembunyikanKartuStatus();
    document.getElementById("kantin-uid").value = "";
}

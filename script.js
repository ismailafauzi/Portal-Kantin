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
// 1. KANTIN DIGITAL (JAJAN & LIMIT HARIAN)
// ======================================================
document.getElementById("kantin-uid").addEventListener("input", async function() {
    let uid = this.value.trim();
    let infoBox = document.getElementById("kantin-info-kartu");
    if (uid.length < 3) {
        infoBox.style.display = "none";
        return;
    }

    let { data, error } = await _supabase.from(TABLE_SANTRI).select("*").eq("UID", uid).single();
    if (data) {
        let limitHarian = data["Limit Harian"] !== undefined ? data["Limit Harian"] : 20000;
        infoBox.style.display = "block";
        infoBox.innerHTML = `<strong>Santri Terdeteksi:</strong> ${data.Nama} <br><strong>Saldo:</strong> Rp ${data.Saldo.toLocaleString()} | <strong>Limit Harian:</strong> Rp ${limitHarian.toLocaleString()}`;
    } else {
        infoBox.style.display = "none";
    }
});

async function prosesJajan() {
    let uid = document.getElementById("kantin-uid").value.trim();
    let nominal = parseInt(document.getElementById("kantin-nominal").value);
    let pin = document.getElementById("kantin-pin").value.trim();
    let resultDiv = document.getElementById("kantin-result");

    if (!uid || nominal <= 0 || !pin) {
        resultDiv.style.color = "red";
        resultDiv.innerText = "❌ Harap isi UID, Nominal (> 0), dan PIN dengan benar!";
        return;
    }

    let { data: santri, error } = await _supabase.from(TABLE_SANTRI).select("*").eq("UID", uid).single();
    if (!santri) {
        resultDiv.style.color = "red";
        resultDiv.innerText = "❌ Kartu belum terdaftar di database!";
        return;
    }

    if (parseInt(pin) !== parseInt(santri.Pin)) {
        resultDiv.style.color = "red";
        resultDiv.innerText = "❌ PIN salah! Silakan coba lagi.";
        return;
    }

    if (nominal > santri.Saldo) {
        resultDiv.style.color = "red";
        resultDiv.innerText = `❌ Saldo tidak cukup. Saldo saat ini: Rp ${santri.Saldo.toLocaleString()}`;
        return;
    }

    // --- CEK TOTAL TRANSAKSI HARI INI UNTUK LIMIT HARIAN ---
    let todayStr = new Date().toISOString().split('T')[0]; // Format: YYYY-MM-DD
    let { data: logsHariIni } = await _supabase
        .from(TABLE_LOG)
        .select("*")
        .eq("ID", santri.ID)
        .ilike("Status", "%Jajan%")
        .gte("Waktu", todayStr + "T00:00:00");

    let totalJajanHariIni = 0;
    if (logsHariIni) {
        logsHariIni.forEach(log => {
            totalJajanHariIni += parseInt(log.Nominal) || 0;
        });
    }

    let limitHarian = santri["Limit Harian"] !== undefined ? santri["Limit Harian"] : 20000;
    let sisaLimitSebelum = limitHarian - totalJajanHariIni;

    if ((totalJajanHariIni + nominal) > limitHarian) {
        resultDiv.style.color = "red";
        resultDiv.innerText = `❌ Melewati Limit Harian!\nLimit: Rp ${limitHarian.toLocaleString()} | Sudah jajan hari ini: Rp ${totalJajanHariIni.toLocaleString()}\nSisa limit tersedia: Rp ${sisaLimitSebelum.toLocaleString()}`;
        return;
    }
    // --------------------------------------------------------

    let saldoBaru = santri.Saldo - nominal;
    let { error: updateErr } = await _supabase.from(TABLE_SANTRI).update({ Saldo: saldoBaru }).eq("UID", uid);
    if (updateErr) {
        resultDiv.style.color = "red";
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

    let totalJajanBaru = totalJajanHariIni + nominal;
    let sisaLimitBaru = limitHarian - totalJajanBaru;

    resultDiv.style.color = "green";
    resultDiv.innerHTML = `
        ✅ TRANSAKSI BERHASIL!<br>
        Nama: <b>${santri.Nama}</b><br>
        Sisa Saldo: <b>Rp ${saldoBaru.toLocaleString()}</b><br>
        Sudah jajan hari ini: <b>Rp ${totalJajanBaru.toLocaleString()}</b><br>
        Sisa Limit Harian: <b>Rp ${sisaLimitBaru.toLocaleString()}</b> (Limit: Rp ${limitHarian.toLocaleString()})
    `;
    document.getElementById("kantin-info-kartu").style.display = "none";
    document.getElementById("kantin-uid").value = "";
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
        res.style.color = "red";
        res.innerText = "❌ Kunci Admin Salah!";
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

    if (!uid || nominal <= 0) {
        resDiv.style.color = "red";
        resDiv.innerText = "❌ UID dan Nominal harus diisi!";
        return;
    }

    let { data: santri } = await _supabase.from(TABLE_SANTRI).select("*").eq("UID", uid).single();
    if (!santri) {
        resDiv.style.color = "red";
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

        resDiv.style.color = "green";
        resDiv.innerText = `✅ Top-Up Tunai Berhasil! Saldo Baru: Rp ${saldoBaru.toLocaleString()}`;
    } else {
        resDiv.style.color = "orange";
        resDiv.innerText = "ℹ️ Gunakan metode Tunai untuk langsung update database frontend.";
    }
}

async function prosesDaftar() {
    let uid = document.getElementById("daftar-uid").value.trim();
    let nama = document.getElementById("daftar-nama").value.trim();
    let kelas = parseInt(document.getElementById("daftar-kelas").value) || 0;
    let kamar = document.getElementById("daftar-kamar").value.trim();
    let pin = document.getElementById("daftar-pin").value.trim();
    let saldoAwal = parseInt(document.getElementById("daftar-saldo").value) || 0;
    let limit = parseInt(document.getElementById("daftar-limit").value) || 20000;
    let resDiv = document.getElementById("daftar-result");

    if (!uid || !nama || !pin) {
        resDiv.style.color = "red";
        resDiv.innerText = "❌ Data utama (UID, Nama, PIN) wajib diisi!";
        return;
    }

    let { data: existing } = await _supabase.from(TABLE_SANTRI).select("*").eq("UID", uid).single();
    if (existing) {
        resDiv.style.color = "red";
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
        resDiv.style.color = "red";
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

    resDiv.style.color = "green";
    resDiv.innerText = `🎉 Santri '${nama}' berhasil didaftarkan! (Limit Harian: Rp ${limit.toLocaleString()})`;
}

async function prosesCekSaldo() {
    let uid = document.getElementById("cek-uid").value.trim();
    let resDiv = document.getElementById("cek-result");
    let { data: santri } = await _supabase.from(TABLE_SANTRI).select("*").eq("UID", uid).single();

    if (santri) {
        let limitHarian = santri["Limit Harian"] !== undefined ? santri["Limit Harian"] : 20000;
        resDiv.style.color = "green";
        resDiv.innerText = `🔍 ${santri.Nama} | Saldo: Rp ${santri.Saldo.toLocaleString()} | Limit Harian: Rp ${limitHarian.toLocaleString()}`;
    } else {
        resDiv.style.color = "red";
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
        res.style.color = "red";
        res.innerText = "❌ Password Salah!";
    }
}

function logoutPemasukan() {
    document.getElementById("pemasukan-login-box").style.display = "block";
    document.getElementById("pemasukan-dashboard").style.display = "none";
    document.getElementById("pemasukan-pw").value = "";
}

async function muatDataPemasukan() {
    let { data: logs, error } = await _supabase.from(TABLE_LOG).select("*").order("Waktu", { ascending: false });
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
        tr.innerHTML = `<td>${new Date(row.Waktu).toLocaleString()}</td><td>${row.Nama}</td><td>Rp ${nominal.toLocaleString()}</td><td>${row.Status}</td>`;
        tbody.appendChild(tr);
    });

    document.getElementById("metric-topup").innerText = `Rp ${totalTopup.toLocaleString()}`;
    document.getElementById("metric-jajan").innerText = `Rp ${totalJajan.toLocaleString()}`;
}

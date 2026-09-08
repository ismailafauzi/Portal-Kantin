<?php
/**
 * config.php
 * ======================================================
 * Koneksi database + fungsi-fungsi helper bersama.
 * Ini adalah versi PHP dari fungsi-fungsi helper Supabase
 * pada kode Python/Streamlit aslinya.
 * ======================================================
 */

declare(strict_types=1);
session_start();

// ------------------------------------------------------
// KONFIGURASI DATABASE — sesuaikan dengan server Anda
// ------------------------------------------------------
const DB_HOST = 'localhost';
const DB_NAME = 'kantin_digital';
const DB_USER = 'root';
const DB_PASS = '';
const DB_CHARSET = 'utf8mb4';

// Nama tabel
const TABLE_SANTRI = 'Data_Santri';
const TABLE_LOG    = 'Log_Transaksi';

// Nama kolom Data_Santri
const COL_UID   = 'UID';
const COL_ID    = 'ID';
const COL_NAMA  = 'Nama';
const COL_KELAS = 'Kelas';
const COL_PIN   = 'Pin';
const COL_SALDO = 'Saldo';
const COL_LIMIT = 'Limit Harian';

// Nama kolom Log_Transaksi
const LOG_WAKTU   = 'Waktu';
const LOG_ID      = 'ID';
const LOG_NAMA    = 'Nama';
const LOG_NOMINAL = 'Nominal';
const LOG_STATUS  = 'Status';

/**
 * Membuka koneksi PDO ke database. Melempar Exception kalau gagal
 * supaya bisa ditangani/ditampilkan sebagai error oleh pemanggil.
 */
function get_pdo(): PDO
{
    static $pdo = null;
    if ($pdo === null) {
        $dsn = 'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=' . DB_CHARSET;
        $pdo = new PDO($dsn, DB_USER, DB_PASS, [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ]);
    }
    return $pdo;
}

/**
 * Ambil satu baris data santri berdasarkan UID kartu.
 * Return array asosiatif, atau null kalau tidak ditemukan.
 */
function ambil_data_santri(string $uid): ?array
{
    $pdo = get_pdo();
    $sql = 'SELECT * FROM `' . TABLE_SANTRI . '` WHERE `' . COL_UID . '` = :uid LIMIT 1';
    $stmt = $pdo->prepare($sql);
    $stmt->execute(['uid' => $uid]);
    $row = $stmt->fetch();
    return $row ?: null;
}

/**
 * Menghitung total nominal jajan (status 'Jajan - Berhasil') milik
 * seorang santri untuk tanggal hari ini (UTC), menjumlahkan kolom
 * Nominal di tabel Log_Transaksi.
 */
function total_jajan_hari_ini(string $id_santri): int
{
    $awal_hari = gmdate('Y-m-d 00:00:00');

    $pdo = get_pdo();
    $sql = 'SELECT `' . LOG_NOMINAL . '` FROM `' . TABLE_LOG . '`
            WHERE `' . LOG_ID . '` = :id
              AND `' . LOG_STATUS . '` = :status
              AND `' . LOG_WAKTU . '` >= :awal_hari';
    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        'id'        => $id_santri,
        'status'    => 'Jajan - Berhasil',
        'awal_hari' => $awal_hari,
    ]);

    $total = 0;
    foreach ($stmt->fetchAll() as $row) {
        $total += (int) ($row[LOG_NOMINAL] ?? 0);
    }
    return $total;
}

/**
 * Ambil info ringkas sebuah kartu: nama, saldo saat ini, limit harian,
 * sudah dipakai hari ini, dan sisa limit hari ini.
 * Return null kalau kartu tidak ditemukan.
 */
function ambil_info_kartu(string $uid): ?array
{
    $data_santri = ambil_data_santri($uid);
    if (!$data_santri) {
        return null;
    }

    $id_santri     = (string) $data_santri[COL_ID];
    $limit_harian  = (int) ($data_santri[COL_LIMIT] ?? 0);
    $sudah_dipakai = total_jajan_hari_ini($id_santri);
    $sisa_limit    = $limit_harian ? max($limit_harian - $sudah_dipakai, 0) : null;

    return [
        'nama'          => $data_santri[COL_NAMA] ?? '-',
        'saldo'         => (int) ($data_santri[COL_SALDO] ?? 0),
        'limit_harian'  => $limit_harian,
        'sudah_dipakai' => $sudah_dipakai,
        'sisa_limit'    => $sisa_limit,
    ];
}

/**
 * Mencatat satu baris transaksi ke tabel Log_Transaksi.
 * Mengembalikan true/false, tidak melempar exception ke pemanggil
 * (supaya transaksi tetap dianggap sukses walau logging gagal,
 * sama seperti versi Python-nya yang cuma menampilkan warning).
 */
function catat_log(string $id_santri, string $nama, int $nominal, string $status): bool
{
    try {
        $pdo = get_pdo();
        $sql = 'INSERT INTO `' . TABLE_LOG . '`
                (`' . LOG_WAKTU . '`, `' . LOG_ID . '`, `' . LOG_NAMA . '`, `' . LOG_NOMINAL . '`, `' . LOG_STATUS . '`)
                VALUES (:waktu, :id, :nama, :nominal, :status)';
        $stmt = $pdo->prepare($sql);
        return $stmt->execute([
            'waktu'   => gmdate('Y-m-d H:i:s'),
            'id'      => $id_santri,
            'nama'    => $nama,
            'nominal' => (string) $nominal,
            'status'  => $status,
        ]);
    } catch (Throwable $e) {
        return false;
    }
}

/**
 * Cek apakah transaksi dengan signature (uid, nominal, pin) yang PERSIS
 * SAMA baru saja diproses dalam $jeda_detik terakhir. Dipakai untuk
 * mencegah transaksi tercatat dobel (kartu terbaca 2x, submit dobel, dll),
 * memakai PHP session sebagai pengganti st.session_state di Streamlit.
 */
function sudah_diproses_baru_saja(string $kunci_sesi, array $signature, float $jeda_detik = 5.0): bool
{
    $sekarang = microtime(true);
    if (isset($_SESSION[$kunci_sesi])) {
        [$signature_lama, $waktu_lama] = $_SESSION[$kunci_sesi];
        if ($signature_lama === $signature && ($sekarang - $waktu_lama) < $jeda_detik) {
            return true;
        }
    }
    $_SESSION[$kunci_sesi] = [$signature, $sekarang];
    return false;
}

/**
 * Alur lengkap transaksi jajan:
 * 1. Cek kartu terdaftar
 * 2. Cek PIN cocok
 * 3. Cek saldo cukup
 * 4. Cek limit harian belum terlampaui
 * 5. Update saldo & catat log
 *
 * Return array asosiatif dengan key 'status' ('success'|'gagal') dan
 * detail tambahan, sama seperti dict yang dikembalikan versi Python.
 */
function proses_jajan(string $uid, string $pin, int $nominal): array
{
    $data_santri = ambil_data_santri($uid);
    if (!$data_santri) {
        return ['status' => 'gagal', 'message' => 'Kartu belum terdaftar di database!'];
    }

    $id_santri      = (string) $data_santri[COL_ID];
    $nama           = $data_santri[COL_NAMA] ?? '-';
    $saldo_saat_ini = (int) ($data_santri[COL_SALDO] ?? 0);
    $pin_tersimpan  = $data_santri[COL_PIN] ?? null;
    $limit_harian   = (int) ($data_santri[COL_LIMIT] ?? 0);

    // 1. Cek PIN
    $pin_cocok = ctype_digit($pin) && $pin_tersimpan !== null && ((int) $pin === (int) $pin_tersimpan);
    if (!$pin_cocok) {
        return ['status' => 'gagal', 'message' => 'PIN salah! Silakan coba lagi.'];
    }

    // 2. Cek saldo cukup
    if ($nominal > $saldo_saat_ini) {
        return [
            'status'  => 'gagal',
            'message' => 'Saldo tidak cukup. Saldo saat ini: Rp ' . number_format($saldo_saat_ini, 0, ',', '.'),
        ];
    }

    // 3. Cek limit harian
    $sudah_jajan_hari_ini = total_jajan_hari_ini($id_santri);
    if ($limit_harian && ($sudah_jajan_hari_ini + $nominal) > $limit_harian) {
        $sisa_limit = max($limit_harian - $sudah_jajan_hari_ini, 0);
        return [
            'status'  => 'gagal',
            'message' => 'Melebihi batas limit jajan harian! Sudah jajan Rp '
                . number_format($sudah_jajan_hari_ini, 0, ',', '.') . ' hari ini, sisa limit Rp '
                . number_format($sisa_limit, 0, ',', '.') . '.',
        ];
    }

    // 4. Update saldo
    $saldo_baru = $saldo_saat_ini - $nominal;
    $pdo = get_pdo();
    $sqlUpdate = 'UPDATE `' . TABLE_SANTRI . '` SET `' . COL_SALDO . '` = :saldo WHERE `' . COL_UID . '` = :uid';
    $stmtUpdate = $pdo->prepare($sqlUpdate);
    $ok = $stmtUpdate->execute(['saldo' => $saldo_baru, 'uid' => $uid]);

    if (!$ok || $stmtUpdate->rowCount() === 0) {
        return ['status' => 'gagal', 'message' => 'Gagal memperbarui saldo di database.'];
    }

    // 5. Catat log
    catat_log($id_santri, $nama, $nominal, 'Jajan - Berhasil');

    return ['status' => 'success', 'nama' => $nama, 'sisa_saldo' => $saldo_baru];
}

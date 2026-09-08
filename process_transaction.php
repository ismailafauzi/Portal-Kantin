<?php
/**
 * api/process_transaction.php
 * ======================================================
 * Dipanggil lewat AJAX saat tombol "PROSES TRANSAKSI JAJAN" ditekan.
 * Setara dengan blok "if submit_button:" di kode Python aslinya:
 * validasi input -> cek dobel-submit -> proses_jajan() -> respon JSON.
 * ======================================================
 */

declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['status' => 'gagal', 'message' => 'Metode tidak diizinkan.']);
    exit;
}

$uid_kartu = trim((string) ($_POST['uid_kartu'] ?? ''));
$pin       = trim((string) ($_POST['pin'] ?? ''));
$nominal_raw = $_POST['nominal'] ?? '';

// ------------------------------------------------------
// Validasi dasar (sama seperti percabangan if/elif di Python)
// ------------------------------------------------------
if ($uid_kartu === '') {
    echo json_encode(['status' => 'gagal', 'message' => 'Kartu belum terdeteksi. Silakan tempelkan kartu lalu tekan tombol lagi.']);
    exit;
}

if (!is_numeric($nominal_raw) || (int) $nominal_raw <= 0) {
    echo json_encode(['status' => 'gagal', 'message' => 'Nominal belanja harus lebih dari Rp 0!']);
    exit;
}
$nominal = (int) $nominal_raw;

if ($pin === '') {
    echo json_encode(['status' => 'gagal', 'message' => 'PIN santri wajib diisi!']);
    exit;
}

// ------------------------------------------------------
// Cek dobel-submit: kartu, nominal & PIN yang sama baru saja diproses
// ------------------------------------------------------
$signature = [$uid_kartu, $nominal, $pin];
if (sudah_diproses_baru_saja('last_jajan_signature', $signature)) {
    echo json_encode([
        'status'  => 'dobel',
        'message' => 'Transaksi jajan dengan kartu & nominal yang sama baru saja diproses beberapa '
            . 'detik lalu. Supaya saldo tidak terpotong dobel (misalnya karena kartu terbaca 2x oleh '
            . 'reader), transaksi ini dilewati. Jika memang ingin jajan lagi dengan nominal sama, '
            . 'tunggu beberapa detik lalu ulangi.',
    ]);
    exit;
}

// ------------------------------------------------------
// Proses transaksi
// ------------------------------------------------------
try {
    $hasil = proses_jajan($uid_kartu, $pin, $nominal);

    if ($hasil['status'] === 'success') {
        $info_setelah = ambil_info_kartu($uid_kartu);
        $sisa_limit = null;
        if ($info_setelah && $info_setelah['limit_harian']) {
            $sisa_limit = $info_setelah['sisa_limit'];
        }

        echo json_encode([
            'status'      => 'success',
            'nama'        => $hasil['nama'],
            'sisa_saldo'  => $hasil['sisa_saldo'],
            'sisa_limit'  => $sisa_limit,
        ]);
    } else {
        echo json_encode(['status' => 'gagal', 'message' => $hasil['message']]);
    }
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['status' => 'gagal', 'message' => 'Terjadi kesalahan koneksi atau sistem: ' . $e->getMessage()]);
}

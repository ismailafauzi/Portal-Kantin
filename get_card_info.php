<?php
/**
 * api/get_card_info.php
 * ======================================================
 * Dipanggil lewat AJAX setiap kali kartu ditap / UID diketik.
 * Hanya MENAMPILKAN info (saldo, limit) — TIDAK memproses transaksi.
 * Setara dengan blok "STEP 1: TAP KARTU" di kode Python aslinya.
 * ======================================================
 */

declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../config.php';

$uid = trim((string) ($_GET['uid'] ?? ''));

if ($uid === '') {
    echo json_encode(['found' => false, 'message' => 'UID kosong.']);
    exit;
}

try {
    $info = ambil_info_kartu($uid);

    if ($info === null) {
        echo json_encode([
            'found'   => false,
            'message' => 'Kartu belum terdaftar di database! Silakan cek kembali atau daftarkan di menu Bendahara.',
        ]);
        exit;
    }

    echo json_encode(['found' => true] + $info);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['found' => false, 'message' => 'Terjadi kesalahan koneksi atau sistem: ' . $e->getMessage()]);
}

-- ======================================================
-- SKEMA DATABASE: KANTIN DIGITAL PESANTREN
-- Jalankan file ini di MySQL/MariaDB sebelum memakai aplikasi.
-- ======================================================

CREATE DATABASE IF NOT EXISTS kantin_digital
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE kantin_digital;

-- Tabel data santri (kartu, saldo, pin, limit harian)
CREATE TABLE IF NOT EXISTS Data_Santri (
    UID           VARCHAR(64)  NOT NULL UNIQUE,   -- ID unik kartu RFID
    ID            VARCHAR(32)  NOT NULL PRIMARY KEY, -- ID induk santri
    Nama          VARCHAR(150) NOT NULL,
    Kelas         VARCHAR(50)  DEFAULT NULL,
    Pin           VARCHAR(10)  NOT NULL,
    Saldo         BIGINT       NOT NULL DEFAULT 0,
    `Limit Harian` BIGINT      NOT NULL DEFAULT 0  -- 0 = tanpa batas
) ENGINE=InnoDB;

-- Tabel log transaksi
CREATE TABLE IF NOT EXISTS Log_Transaksi (
    id_log   BIGINT AUTO_INCREMENT PRIMARY KEY,
    Waktu    DATETIME     NOT NULL,
    ID       VARCHAR(32)  NOT NULL,
    Nama     VARCHAR(150) NOT NULL,
    Nominal  VARCHAR(32)  NOT NULL,
    Status   VARCHAR(50)  NOT NULL,
    INDEX idx_id_waktu (ID, Waktu)
) ENGINE=InnoDB;

-- Contoh data uji (hapus/ubah sesuai kebutuhan)
-- INSERT INTO Data_Santri (UID, ID, Nama, Kelas, Pin, Saldo, `Limit Harian`)
-- VALUES ('04A1B2C3', 'S001', 'Ahmad Fauzi', 'VII-A', '1234', 50000, 20000);

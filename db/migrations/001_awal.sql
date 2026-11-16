-- Skema awal: data lingkungan, akun terminal, sesi, dan jejak audit.

-- ------------------------------------------------------------------ data lingkungan

CREATE TABLE lokasi (
  id        text PRIMARY KEY,
  nama      text NOT NULL,
  singkat   text NOT NULL,
  tipe      text NOT NULL,
  provinsi  text NOT NULL,
  grade     text,
  urutan    int  NOT NULL UNIQUE
);

CREATE TABLE metrik (
  id            text PRIMARY KEY,            -- jalur lengkap, mis. "Sampah > Dihasilkan > Plastik"
  kategori      text NOT NULL,
  level         text[] NOT NULL,             -- jalur di bawah kategori
  satuan        text NOT NULL,
  bisa_input    boolean NOT NULL DEFAULT false,
  urutan_input  int,                         -- urutan kolom di Excel 2026
  satuan_input  text                         -- satuan yang diminta di formulir (mis. mg/L)
);

-- Satu baris per nilai. bulan = 0 berarti data tahunan (2021-2024).
CREATE TABLE fakta (
  lokasi_id  text NOT NULL REFERENCES lokasi(id),
  tahun      int  NOT NULL,
  bulan      int  NOT NULL CHECK (bulan BETWEEN 0 AND 12),
  metrik_id  text NOT NULL REFERENCES metrik(id),
  nilai      double precision NOT NULL,
  satuan     text,                           -- hanya jika berbeda dari satuan bawaan metrik
  cek        boolean NOT NULL DEFAULT false, -- nilai ditandai "perlu dicek"
  sintetis   boolean NOT NULL DEFAULT false, -- selisih Total vs rincian ("Tidak Terinci")
  PRIMARY KEY (lokasi_id, tahun, bulan, metrik_id)
);
CREATE INDEX fakta_metrik_idx ON fakta (metrik_id);
CREATE INDEX fakta_periode_idx ON fakta (tahun, bulan);

-- Kategori yang sudah diisi pada suatu lokasi dan periode (termasuk isian bernilai nol).
CREATE TABLE terisi (
  lokasi_id  text NOT NULL REFERENCES lokasi(id),
  tahun      int  NOT NULL,
  bulan      int  NOT NULL CHECK (bulan BETWEEN 0 AND 12),
  kategori   text NOT NULL,
  jumlah     int  NOT NULL,
  nonnol     int  NOT NULL,
  PRIMARY KEY (lokasi_id, tahun, bulan, kategori)
);

-- Naik setiap kali data berubah; dipakai untuk memvalidasi cache dataset.
CREATE TABLE versi_data (
  id     int PRIMARY KEY CHECK (id = 1),
  versi  bigint NOT NULL
);
INSERT INTO versi_data (id, versi) VALUES (1, 1);

-- ------------------------------------------------------------------ akun dan sesi

CREATE TABLE pengguna (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username        text NOT NULL UNIQUE CHECK (username = lower(username)),
  nama            text NOT NULL,
  peran           text NOT NULL CHECK (peran IN ('admin', 'terminal')),
  lokasi_id       text REFERENCES lokasi(id),
  hash_sandi      text NOT NULL,
  aktif           boolean NOT NULL DEFAULT true,
  harus_ganti     boolean NOT NULL DEFAULT true,
  dibuat          timestamptz NOT NULL DEFAULT now(),
  terakhir_login  timestamptz,
  -- Akun terminal wajib terikat ke satu lokasi; admin tidak terikat ke lokasi mana pun.
  CHECK ((peran = 'terminal') = (lokasi_id IS NOT NULL))
);
-- Satu akun terminal per lokasi.
CREATE UNIQUE INDEX pengguna_satu_per_lokasi ON pengguna (lokasi_id) WHERE lokasi_id IS NOT NULL;

-- Token sesi tidak disimpan; hanya hash SHA-256-nya.
CREATE TABLE sesi (
  id_hash         text PRIMARY KEY,
  pengguna_id     uuid NOT NULL REFERENCES pengguna(id) ON DELETE CASCADE,
  dibuat          timestamptz NOT NULL DEFAULT now(),
  terakhir_aktif  timestamptz NOT NULL DEFAULT now(),
  kedaluwarsa     timestamptz NOT NULL,
  ip              text,
  ua              text
);
CREATE INDEX sesi_pengguna_idx ON sesi (pengguna_id);

-- Pembatas percobaan login (per nama pengguna dan per alamat IP).
CREATE TABLE percobaan_login (
  kunci            text PRIMARY KEY,
  jumlah           int NOT NULL DEFAULT 0,
  jendela_mulai    timestamptz NOT NULL DEFAULT now(),
  terkunci_sampai  timestamptz
);

-- ------------------------------------------------------------------ jejak

CREATE TABLE riwayat_input (
  id          bigserial PRIMARY KEY,
  waktu       timestamptz NOT NULL DEFAULT now(),
  pengguna_id uuid NOT NULL REFERENCES pengguna(id),
  lokasi_id   text NOT NULL,
  tahun       int NOT NULL,
  bulan       int NOT NULL,
  metrik_id   text NOT NULL,
  nilai_lama  double precision,
  nilai_baru  double precision,
  dikonfirmasi boolean NOT NULL DEFAULT false
);
CREATE INDEX riwayat_lokasi_idx ON riwayat_input (lokasi_id, tahun, bulan);

CREATE TABLE audit (
  id          bigserial PRIMARY KEY,
  waktu       timestamptz NOT NULL DEFAULT now(),
  pengguna_id uuid,
  aksi        text NOT NULL,
  detail      jsonb,
  ip          text
);
CREATE INDEX audit_waktu_idx ON audit (waktu DESC);

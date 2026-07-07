-- 01-create-databases.sql
-- Tworzy wszystkie bazy danych wymagane przez system Shogun.
-- Plik wykonywany automatycznie przez MariaDB przy pierwszym uruchomieniu.

CREATE DATABASE IF NOT EXISTS shogun_users
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

CREATE DATABASE IF NOT EXISTS pj_assignments
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

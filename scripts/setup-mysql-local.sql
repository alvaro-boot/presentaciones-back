-- Ejecutar en MySQL local (Workbench, phpMyAdmin, mysql -u root -p)
-- Sin Docker: instale MySQL 8 o use XAMPP/WAMP (solo el servicio MySQL).

CREATE DATABASE IF NOT EXISTS cootravir_propuestas
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

CREATE USER IF NOT EXISTS 'cootravir'@'localhost' IDENTIFIED BY 'cootravir';
GRANT ALL PRIVILEGES ON cootravir_propuestas.* TO 'cootravir'@'localhost';
FLUSH PRIVILEGES;

-- 02-keycloak-user.sql
-- Tworzy dedykowanego użytkownika dla Keycloak z dostępem do bazy shogun_users.
-- Keycloak NIE powinien używać roota w środowisku produkcyjnym.

CREATE USER IF NOT EXISTS 'keycloak'@'%' IDENTIFIED BY 'keycloakpass';
GRANT ALL PRIVILEGES ON shogun_users.* TO 'keycloak'@'%';
FLUSH PRIVILEGES;

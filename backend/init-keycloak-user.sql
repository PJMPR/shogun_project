-- init-keycloak-user.sql
CREATE USER IF NOT EXISTS 'keycloak'@'%' IDENTIFIED BY 'keycloakpass';
GRANT ALL PRIVILEGES ON shogun_users.* TO 'keycloak'@'%';
FLUSH PRIVILEGES;

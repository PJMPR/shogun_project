output "keycloak_realm_id" {
  value = keycloak_realm.shogun.id
}

output "users_service_client_secret" {
  description = "Client secret dla shogun-users-service — wklej do backend/.env jako USERS_SERVICE_CLIENT_SECRET"
  value       = keycloak_openid_client.shogun_users_service.client_secret
  sensitive   = true
}

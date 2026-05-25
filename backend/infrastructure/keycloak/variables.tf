variable "keycloak_url" {
  description = "Base URL Keycloak (np. http://localhost:8180)"
  type        = string
}

variable "keycloak_admin_user" {
  description = "Login admina Keycloak (np. z .env)"
  type        = string
}

variable "keycloak_admin_pass" {
  description = "Hasło admina Keycloak (np. z .env)"
  type        = string
  sensitive   = true
}

variable "keycloak_admin_client_id" {
  description = "Client ID do logowania admina (zazwyczaj 'admin-cli')"
  type        = string
  default     = "admin-cli"
}

variable "keycloak_admin_client_secret" {
  description = "Client secret do logowania admina (zazwyczaj puste)"
  type        = string
  default     = ""
}

variable "google_client_id" {
  description = "Google OAuth Client ID (uzupełnij)"
  type        = string
}

variable "google_client_secret" {
  description = "Google OAuth Client Secret (uzupełnij)"
  type        = string
  sensitive   = true
}

resource "keycloak_realm" "shogun" {
  realm        = "shogun"
  enabled      = true
  display_name = "Shogun"
}

resource "keycloak_openid_client" "shogun_web" {
  realm_id            = keycloak_realm.shogun.id
  client_id           = "shogun-web"
  name                = "shogun-web"
  enabled             = true
  access_type         = "PUBLIC"
  standard_flow_enabled = true
  direct_access_grants_enabled = false
  root_url            = "https://shogun.pjwstk.edu.pl:8443"
  valid_redirect_uris = ["https://shogun.pjwstk.edu.pl:8443/*"]
  web_origins         = ["https://shogun.pjwstk.edu.pl:8443"]
  consent_required    = true
}

resource "keycloak_openid_client" "shogun_users_service" {
  realm_id            = keycloak_realm.shogun.id
  client_id           = "shogun-users-service"
  name                = "shogun-users-service"
  enabled             = true
  access_type         = "CONFIDENTIAL"
  service_accounts_enabled = true
  standard_flow_enabled = false
  direct_access_grants_enabled = false
}

resource "keycloak_identity_provider" "google" {
  realm         = keycloak_realm.shogun.id
  alias         = "google"
  provider_id   = "google"
  enabled       = true
  store_token   = false
  authenticate_by_default = false
  link_only     = false
  first_broker_login_flow_alias = "first broker login"
  config = {
    clientId     = var.google_client_id
    clientSecret = var.google_client_secret
    defaultScope = "openid email profile"
    hostedDomain = "pjwstk.edu.pl"
  }
}

# Mapowania atrybutów Google
resource "keycloak_identity_provider_mapper" "google_email" {
  name             = "email"
  realm            = keycloak_realm.shogun.id
  identity_provider_alias = keycloak_identity_provider.google.alias
  identity_provider_mapper = "oidc-user-attribute-idp-mapper"
  config = {
    "claim" = "email"
    "user.attribute" = "email"
  }
}
resource "keycloak_identity_provider_mapper" "google_first_name" {
  name             = "first name"
  realm            = keycloak_realm.shogun.id
  identity_provider_alias = keycloak_identity_provider.google.alias
  identity_provider_mapper = "oidc-user-attribute-idp-mapper"
  config = {
    "claim" = "given_name"
    "user.attribute" = "firstName"
  }
}
resource "keycloak_identity_provider_mapper" "google_last_name" {
  name             = "last name"
  realm            = keycloak_realm.shogun.id
  identity_provider_alias = keycloak_identity_provider.google.alias
  identity_provider_mapper = "oidc-user-attribute-idp-mapper"
  config = {
    "claim" = "family_name"
    "user.attribute" = "lastName"
  }
}

# Role i uprawnienia dla service account
resource "keycloak_role" "view_users" {
  realm_id = keycloak_realm.shogun.id
  name     = "view-users"
}
resource "keycloak_role" "manage_users" {
  realm_id = keycloak_realm.shogun.id
  name     = "manage-users"
}
resource "keycloak_role" "view_realm" {
  realm_id = keycloak_realm.shogun.id
  name     = "view-realm"
}
resource "keycloak_role" "manage_realm" {
  realm_id = keycloak_realm.shogun.id
  name     = "manage-realm"
}
# Przypisanie ról do service account
resource "keycloak_openid_client_service_account_role" "users_service_roles" {
  realm_id            = keycloak_realm.shogun.id
  service_account_user_id = keycloak_openid_client.shogun_users_service.service_account_user_id
  role_ids            = [
    keycloak_role.view_users.id,
    keycloak_role.manage_users.id,
    keycloak_role.view_realm.id,
    keycloak_role.manage_realm.id
  ]
}

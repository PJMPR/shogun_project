locals {
  port_suffix = var.app_port != "" ? ":${var.app_port}" : ""
}

resource "keycloak_realm" "shogun" {
  realm        = "shogun"
  enabled      = true
  display_name = "Shogun"
}

resource "keycloak_openid_client" "shogun_web" {
  realm_id                     = keycloak_realm.shogun.id
  client_id                    = "shogun-web"
  name                         = "shogun-web"
  enabled                      = true
  access_type                  = "PUBLIC"
  standard_flow_enabled        = true
  direct_access_grants_enabled = false
  root_url                     = "https://shogun.pjwstk.edu.pl${local.port_suffix}"
  valid_redirect_uris = [
    "http://localhost:8080/*",
    "https://localhost:8443/*",
    "http://127.0.0.1:8080/*",
    "https://127.0.0.1:8443/*",
    "https://shogun.pjwstk.edu.pl${local.port_suffix}/*",
    "https://shogun.pja.edu.pl${local.port_suffix}/*",
  ]
  web_origins = [
    "http://localhost:8080",
    "https://localhost:8443",
    "http://127.0.0.1:8080",
    "https://127.0.0.1:8443",
    "https://shogun.pjwstk.edu.pl${local.port_suffix}",
    "https://shogun.pja.edu.pl${local.port_suffix}",
  ]
  consent_required = false
}

resource "keycloak_openid_client" "shogun_users_service" {
  realm_id                     = keycloak_realm.shogun.id
  client_id                    = "shogun-users-service"
  name                         = "shogun-users-service"
  enabled                      = true
  access_type                  = "CONFIDENTIAL"
  service_accounts_enabled     = true
  standard_flow_enabled        = false
  direct_access_grants_enabled = false
}

resource "keycloak_oidc_google_identity_provider" "google" {
  realm                         = keycloak_realm.shogun.id
  client_id                     = var.google_client_id
  client_secret                 = var.google_client_secret
  hosted_domain                 = "pjwstk.edu.pl"
  default_scopes                = "openid email profile"
  store_token                   = false
  first_broker_login_flow_alias = "first broker login"
  trust_email                   = false
}

# Mapowania atrybutów Google
resource "keycloak_authentication_flow" "google_browser" {
  realm_id    = keycloak_realm.shogun.id
  alias       = "shogun-google-browser"
  description = "Browser flow that redirects users directly to Google."
  provider_id = "basic-flow"
}

resource "keycloak_authentication_execution" "google_redirector" {
  realm_id          = keycloak_realm.shogun.id
  parent_flow_alias = keycloak_authentication_flow.google_browser.alias
  authenticator     = "identity-provider-redirector"
  requirement       = "REQUIRED"
}

resource "keycloak_authentication_execution_config" "google_redirector" {
  realm_id     = keycloak_realm.shogun.id
  execution_id = keycloak_authentication_execution.google_redirector.id
  alias        = "google-redirector"

  config = {
    defaultProvider = keycloak_oidc_google_identity_provider.google.alias
  }
}

resource "keycloak_authentication_bindings" "browser_flow" {
  realm_id     = keycloak_realm.shogun.id
  browser_flow = keycloak_authentication_flow.google_browser.alias

  depends_on = [
    keycloak_authentication_execution_config.google_redirector,
  ]
}

resource "keycloak_custom_identity_provider_mapper" "google_email" {
  name                     = "email"
  realm                    = keycloak_realm.shogun.id
  identity_provider_alias  = keycloak_oidc_google_identity_provider.google.alias
  identity_provider_mapper = "oidc-user-attribute-idp-mapper"
  extra_config = {
    "claim"          = "email"
    "user.attribute" = "email"
    "syncMode"       = "INHERIT"
  }
}

resource "keycloak_custom_identity_provider_mapper" "google_first_name" {
  name                     = "first name"
  realm                    = keycloak_realm.shogun.id
  identity_provider_alias  = keycloak_oidc_google_identity_provider.google.alias
  identity_provider_mapper = "oidc-user-attribute-idp-mapper"
  extra_config = {
    "claim"          = "given_name"
    "user.attribute" = "firstName"
    "syncMode"       = "INHERIT"
  }
}

resource "keycloak_custom_identity_provider_mapper" "google_last_name" {
  name                     = "last name"
  realm                    = keycloak_realm.shogun.id
  identity_provider_alias  = keycloak_oidc_google_identity_provider.google.alias
  identity_provider_mapper = "oidc-user-attribute-idp-mapper"
  extra_config = {
    "claim"          = "family_name"
    "user.attribute" = "lastName"
    "syncMode"       = "INHERIT"
  }
}

# ── Service account roles dla shogun-users-service ───────────────────────
# Wymagane są role z wbudowanego klienta realm-management (Admin API),
# a NIE własne role realm-level.

data "keycloak_openid_client" "realm_management" {
  realm_id  = keycloak_realm.shogun.id
  client_id = "realm-management"
}

data "keycloak_role" "view_users" {
  realm_id  = keycloak_realm.shogun.id
  client_id = data.keycloak_openid_client.realm_management.id
  name      = "view-users"
}

data "keycloak_role" "manage_users" {
  realm_id  = keycloak_realm.shogun.id
  client_id = data.keycloak_openid_client.realm_management.id
  name      = "manage-users"
}

data "keycloak_role" "view_realm" {
  realm_id  = keycloak_realm.shogun.id
  client_id = data.keycloak_openid_client.realm_management.id
  name      = "view-realm"
}

data "keycloak_role" "manage_realm" {
  realm_id  = keycloak_realm.shogun.id
  client_id = data.keycloak_openid_client.realm_management.id
  name      = "manage-realm"
}

# Jeden zasób na rolę — wymaganie providera mrparkers/keycloak
resource "keycloak_openid_client_service_account_role" "users_service_view_users" {
  realm_id                = keycloak_realm.shogun.id
  service_account_user_id = keycloak_openid_client.shogun_users_service.service_account_user_id
  client_id               = data.keycloak_openid_client.realm_management.id
  role                    = data.keycloak_role.view_users.name
  depends_on              = [keycloak_openid_client.shogun_users_service]
}

resource "keycloak_openid_client_service_account_role" "users_service_manage_users" {
  realm_id                = keycloak_realm.shogun.id
  service_account_user_id = keycloak_openid_client.shogun_users_service.service_account_user_id
  client_id               = data.keycloak_openid_client.realm_management.id
  role                    = data.keycloak_role.manage_users.name
  depends_on              = [keycloak_openid_client.shogun_users_service]
}

resource "keycloak_openid_client_service_account_role" "users_service_view_realm" {
  realm_id                = keycloak_realm.shogun.id
  service_account_user_id = keycloak_openid_client.shogun_users_service.service_account_user_id
  client_id               = data.keycloak_openid_client.realm_management.id
  role                    = data.keycloak_role.view_realm.name
  depends_on              = [keycloak_openid_client.shogun_users_service]
}

resource "keycloak_openid_client_service_account_role" "users_service_manage_realm" {
  realm_id                = keycloak_realm.shogun.id
  service_account_user_id = keycloak_openid_client.shogun_users_service.service_account_user_id
  client_id               = data.keycloak_openid_client.realm_management.id
  role                    = data.keycloak_role.manage_realm.name
  depends_on              = [keycloak_openid_client.shogun_users_service]
}

# ── Role aplikacyjne (managed by Shogun) ─────────────────────────────────────
# Wymagane przez UsersService: role z atrybutem managedBy=["shogun"]
# i opcjonalnym atrybutem projects="program,sylabus,obsady"

resource "keycloak_role" "app_admin" {
  realm_id    = keycloak_realm.shogun.id
  name        = "admin"
  description = "shogun: pelny dostep administratora"
  attributes = {
    "managedBy" = "shogun"
    "projects"  = "program,sylabus,obsady,users"
  }
}

resource "keycloak_role" "app_pracownik" {
  realm_id    = keycloak_realm.shogun.id
  name        = "pracownik"
  description = "shogun: pracownik dydaktyczny"
  attributes = {
    "managedBy" = "shogun"
    "projects"  = "program,sylabus,obsady"
  }
}

resource "keycloak_role" "app_student" {
  realm_id    = keycloak_realm.shogun.id
  name        = "student"
  description = "shogun: student"
  attributes = {
    "managedBy" = "shogun"
    "projects"  = "program,sylabus"
  }
}

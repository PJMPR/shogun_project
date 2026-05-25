terraform {
  required_providers {
    keycloak = {
      source  = "mrparkers/keycloak"
      version = ">= 4.0.0"
    }
  }
  backend "local" {
    path = "terraform.tfstate"
  }
}

provider "keycloak" {
  client_id     = var.keycloak_admin_client_id
  client_secret = var.keycloak_admin_client_secret
  username      = var.keycloak_admin_user
  password      = var.keycloak_admin_pass
  url           = var.keycloak_url
  realm         = "master"
}

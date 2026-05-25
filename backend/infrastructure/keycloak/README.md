# Terraform Keycloak automation for Shogun

## Wymagania
- Zainstalowany Terraform (https://www.terraform.io/downloads)
- Uruchomiony lokalnie Keycloak (np. przez Docker, domyślnie http://localhost:8180)
- Uzupełnione dane dostępowe admina Keycloak w pliku .env lub terraform.tfvars

## Szybki start

1. Przejdź do katalogu:
   ```bash
   cd backend/infrastructure/keycloak
   ```
2. Skopiuj plik z przykładowymi zmiennymi:
   ```bash
   cp terraform.tfvars.example terraform.tfvars
   ```
   Uzupełnij wartości (szczególnie google_client_id, google_client_secret).
3. Zainicjuj projekt:
   ```bash
   terraform init
   ```
4. Sprawdź plan zmian:
   ```bash
   terraform plan
   ```
5. Zastosuj konfigurację:
   ```bash
   terraform apply
   ```

## Co konfiguruje ten projekt?
- Realm `shogun`
- Klient `shogun-web` (Angular, publiczny)
- Klient `shogun-users-service` (service account)
- Google Identity Provider
- Mapowania atrybutów, role, consent, ograniczenia domeny

## Uwaga
- Hasła i sekrety możesz przekazywać przez terraform.tfvars lub zmienne środowiskowe.
- Stan (terraform.tfstate) jest lokalny w tym katalogu.
- Szczegóły konfiguracji znajdziesz w plikach .tf.

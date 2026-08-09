# Backup MariaDB i PostgreSQL

Kontener wykonuje przy starcie, a następnie co `BACKUP_INTERVAL_SECONDS`, dwa logiczne backupy:

- `mariadb/mariadb-all-<UTC>.sql.gz` — wszystkie bazy MariaDB, w tym `shogun_users` i `pj_assignments`;
- `postgres/<baza>-<UTC>.dump` — baza planu w formacie custom `pg_dump`.

Każde archiwum ma plik `.sha256`. Pliki `.part` są atomowo przemianowywane dopiero po sprawdzeniu backupu. Domyślna retencja wynosi 14 dni. Sam backup na tym samym serwerze chroni przed awarią bazy, ale nie przed utratą całego serwera — katalog należy dodatkowo kopiować na inną maszynę lub storage obiektowy.

## Ręczne wykonanie

```bash
docker compose -f deployment/docker-compose.databases.prod.yml --env-file deployment/.env.prod exec db-backup /app/backup.sh
```

## Weryfikacja

```bash
cd deployment/backups
sha256sum -c mariadb/*.sha256
sha256sum -c postgres/*.sha256
```

## Odtworzenie MariaDB

Najpierw zatrzymaj API i Keycloak zapisujące do MariaDB. Polecenie odtwarza wszystkie bazy zawarte w archiwum:

```bash
gzip -dc deployment/backups/mariadb/mariadb-all-YYYYMMDDTHHMMSSZ.sql.gz | \
  docker exec -i pj_mariadb sh -c 'exec mariadb -uroot -p"$MARIADB_ROOT_PASSWORD"'
```

Hasło jest pobierane ze środowiska kontenera MariaDB i nie pojawia się w historii poleceń. Odtwarzanie nadpisuje obiekty obecne w backupie, dlatego najpierw zachowaj również aktualny stan.

## Odtworzenie PostgreSQL

Zatrzymaj Schedule API, a następnie odtwórz backup do istniejącej bazy:

```bash
docker cp deployment/backups/postgres/pj_schedule-YYYYMMDDTHHMMSSZ.dump pj_postgres_schedule:/tmp/restore.dump
docker exec -it pj_postgres_schedule pg_restore \
  --username shogun_schedule --dbname pj_schedule --clean --if-exists --no-owner /tmp/restore.dump
docker exec pj_postgres_schedule rm /tmp/restore.dump
```

Nazwę użytkownika i bazy dopasuj do `.env.prod`.

# Shogun Email API

Wewnętrzny serwis wysyłający osobne wiadomości HTML przez Gmail SMTP.

## Endpoint

`POST /api/emails`, z nagłówkiem `X-Internal-Api-Key`.

```json
{
  "subject": "Zmiana w planie zajęć",
  "heading": "Aktualizacja planu",
  "message": "Plan zajęć został zaktualizowany.",
  "comments": ["Zmiana sali na 204"],
  "link": "https://shogun.pjwstk.edu.pl/schedule",
  "linkText": "Otwórz plan zajęć",
  "recipients": [{ "name": "Jan Kowalski", "email": "jan.kowalski@pjwstk.edu.pl" }]
}
```

Odpowiedź `200` oznacza pełny sukces. Jeśli choć jedna wiadomość nie zostanie wysłana po trzech próbach, serwis zwraca `502` z `{ "sent": 3, "failed": 1 }`. Treść i dane odbiorców nie są logowane.

## Gmail

Na koncie Google należy włączyć weryfikację dwuetapową, utworzyć hasło aplikacji i zweryfikować `shogun@pjwstk.edu.pl` w Gmailu jako adres „Wyślij pocztę jako”. Loginem SMTP jest adres konta głównego, a hasłem wygenerowane hasło aplikacji.

# Eksport Kadry — plan Shogun.Export.Api

Status: plan do implementacji. Nie obejmuje wykonania serwisu ani zmian UI.

## Ustalenia z użytkownikiem

- Osobna usługa `Shogun.Export.Api` generuje dwa pliki XLSX na podstawie szablonów znajdujących się w katalogu głównym repozytorium.
- Rok akademicki i kierunek pochodzą z filtrów Kadry. Okno eksportu pozwala wybrać tryb stacjonarny albo niestacjonarny, początkowo zgodny z widokiem Kadry.
- Zakres danych jest taki jak w Kadrze: zapisane plany robocze i opublikowane, cały rok akademicki. Niezapisane zmiany planisty nie trafiają do eksportu.
- Program obejmuje tylko przedmioty z przypisanymi prowadzącymi. Plik będzie później ręcznie weryfikowany i poprawiany.
- Godziny programowe i ECTS pochodzą z sylabusów. Godziny obciążenia poszczególnych prowadzących pochodzą z Kadry.
- Program mieści się w jednym arkuszu ze wszystkimi semestrami, zgodnie z szablonem.
- W programie przy prowadzących są tylko imiona i nazwiska, bez stopni i tytułów. Zachowujemy aktualny zapis nazwy wyświetlanej, bez dzielenia lub odwracania jego części.
- Osobna lista prowadzących zawiera nazwy osób oraz ich stopnie/tytuły naukowe.

## Założenia robocze

- Lista prowadzących obejmuje osoby z przydziałów w wybranym roku, kierunku i trybie, po jednej pozycji na stabilny identyfikator osoby. Dwie osoby o takiej samej nazwie pozostają osobnymi pozycjami. Sortowanie według aktualnej nazwy wyświetlanej.
- Eksport nie zależy od wyszukiwania ani wybranego sposobu grupowania w UI Kadry.
- Brak tytułu oznacza pustą komórkę, nie błąd eksportu.
- Brak lub niejednoznaczne dopasowanie sylabusu pozostawia odpowiednie dane programowe puste i oznaczone komentarzem komórki do ręcznej weryfikacji. Nie zastępujemy ich zerem ani obciążeniem Kadry.
- Awaria API źródłowego przerywa eksport i daje czytelny błąd; nie jest traktowana jako brak sylabusu.
- Poziom studiów pozostaje zgodny z Kadrą: obecnie I stopień.

## Stan kodu i źródła danych

Backend Kadry jest modułem `Shogun.Schedule`. Dostępne są endpointy `/api/v1/faculty/filters`, `/workload`, `/lecturers` i zapis tytułów; dostęp mają role `admin,dezyderaty`. Dokument `faculty-backend-plan.md` opisuje wcześniejszy plan, natomiast lokalny kod zawiera już jego implementację.

`FacultyWorkloadDto` zawiera osoby, przedmioty i przydziały z semestrem, formą oraz godzinami. Nie zawiera ECTS ani godzin programowych. Obecna agregacja opiera się na wpisach zajęć; samo powiązanie `ScheduleSubjectLecturer` bez wpisu nie tworzy przydziału godzinowego.

Na potrzeby eksportu należy zapewnić w API Kadry komplet przedmiotów z przypisaną osobą, również gdy nie ma jeszcze wpisów zajęć. Takie powiązanie nie może generować fikcyjnych godzin: nieznane obciążenie pozostaje puste, a rzeczywiste zero pozostaje zerem. Rozszerzenie musi zachować dotychczasowe sumy widoku Kadry.

Do dopasowania sylabusów potrzebna jest tożsamość źródłowa przedmiotu, nie samo podobieństwo nazwy. Należy udostępnić w kontrakcie dane dostępne w planiście: źródło, identyfikator zewnętrzny, kod i kontekst semestru/kierunku. Sprawdzić także obecne dopasowanie przedmiotów w `FacultyService`, aby różne kody o tej samej nazwie nie były scalane.

Sylabusy w `Shogun.ProgramData.Service` zawierają kod, tryb, kierunek, semestr, datę wersji, profil, ECTS i rozkład godzin. Model sylabusu nie deklaruje bezpośrednio roku akademickiego. Przed implementacją dopasowania należy sprawdzić relacje programu do sylabusu i semantykę wersji; nie wybierać arbitralnie pierwszego wyniku ani zakładać historycznej zgodności na podstawie daty wersji. Jeśli relacja nie pozwala wskazać wersji jednoznacznie, zastosować opisaną wyżej obsługę niejednoznaczności.

## Architektura i API

- Nowy projekt `backend/Shogun.Export/Shogun.Export.Api`, z testami generatorów i endpointów, zgodnie z konwencjami istniejących usług.
- Dwa generatory za wspólnym interfejsem eksportu: program studiów oraz lista prowadzących. Dodanie przyszłej opcji nie wymaga zmiany logiki istniejących generatorów.
- Klienci HTTP do `Shogun.Schedule` i `Shogun.ProgramData.Service`; bez bezpośredniego dostępu do ich baz i bez własnej bazy eksportu.
- Backend pobiera aktualne dane ze źródeł. Frontend przekazuje zakres, nie gotowe wiersze ani obliczone godziny.
- Generowanie w ramach żądania HTTP, bez kolejki na obecny zakres. Przekazywanie anulowania, ograniczone czasy żądań i zwalnianie zasobów po pobraniu.
- Uwierzytelnienie Keycloak oraz role `admin,dezyderaty`, zgodnie z Kadrą. Dostęp do API źródłowych musi być jawnie sprawdzony; nie rozszerzać uprawnień do edycji planów ani sylabusów na potrzeby eksportu.

Proponowane endpointy:

| Metoda | Ścieżka | Wynik |
| --- | --- | --- |
| GET | `/api/v1/exports/study-program?academicYear=2026%2F2027&facultyCode=WI&studyMode=stationary` | Program studiów XLSX |
| GET | `/api/v1/exports/lecturers?academicYear=2026%2F2027&facultyCode=WI&studyMode=stationary` | Lista osób XLSX |

Tryby mają wartości zgodne z frontendem Kadry: `stationary`, `partTime`. Odpowiedź plikowa ma właściwy MIME XLSX i `Content-Disposition` z nazwą zawierającą typ, kierunek, rok i tryb. Walidacja zakresu, rozróżnienie 401/403, braku danych i awarii źródła; błędy jako ProblemDetails. Przy braku osób/przedmiotów w zakresie zwrócić komunikat o braku danych zamiast pustego pliku.

## Generator programu studiów

Szablon: `Szablon programu studiów do POL-onu.xlsx`.

- Zachować układ nagłówków, sekcje semestrów, numerację, nazwy przedmiotów, skróty, kolumny godzin, oznaczenia lat i zimy/lata oraz ECTS.
- Jeden wiersz na przedmiot w danym semestrze. Nie scalać wystąpień przedmiotu między semestrami.
- Godziny programowe: wykład z pola `ClassHoursForm.Lectures`; ćwiczenia jako suma `ExercisesLectorateSeminar` oraz `LaboratoryProject`, zgodnie z grupowaniem form innych niż wykład w Kadrze. Zachować rozróżnienie brakujących wartości i zera.
- ECTS z `Content.Ects`. Nie używać godzin pracy własnej ani całkowitego nakładu studenta jako godzin zajęć.
- Przy prowadzącym sumować jego przydziały dla tego przedmiotu, semestru i wynikowej formy, według reguł Kadry. Nie mnożyć wspólnego wpisu przez liczbę grup. Nie wymuszać zgodności sumy obciążeń z godzinami programowymi: osobne grupy mogą powodować wyższe obciążenie.
- Wyznaczyć globalnie dla arkusza maksymalną liczbę osób prowadzących wykład i osobno ćwiczenia. Zachować co najmniej jedną parę dla każdej formy.
- Kolejność kolumn: wszystkie pary `Prowadzący wykład | godziny wykładu`, następnie wszystkie pary `Prowadzący ćwiczenia | godziny ćwiczeń`. Ta sama osoba może wystąpić w obu blokach.
- Osoby porządkować deterministycznie według nazwy i ID. Pozostałe miejsca w wierszu pozostają puste.
- Dynamicznie rozszerzać sekcje semestrów, scalenia i obszar wydruku; liczba przykładowych wierszy szablonu nie ogranicza danych.
- Godziny i ECTS zapisywać jako wartości liczbowe, nazwy jako tekst. Godziny sumować bez wcześniejszego zaokrąglania i wyświetlać z maksymalnie dwoma miejscami po przecinku.

## Generator listy prowadzących

Szablon: `POL-on tabela lista osób prowadzących zajęcia dydaktyczne.xlsx`.

- Uzupełnić rok, kierunek, poziom i tryb; profil pobrać z jednoznacznych danych źródłowych. Przy jego braku lub konflikcie pozostawić pole do weryfikacji.
- Kolumny: `Lp.`, `Nazwisko i imię`, `tytuł/stopień naukowy`, zgodnie z szablonem. Wartość nazwy zachować w aktualnej kolejności, mimo brzmienia nagłówka.
- Uwzględnić osoby bez konta oraz osoby przypisane do przedmiotu bez wpisów godzinowych.
- Deduplikować po ID osoby w całym zakresie, niezależnie od liczby przedmiotów, semestrów i form.
- Tytuły odczytać z profili Kadry; w programie studiów ich nie umieszczać.

## Frontend Kadry

- Dodać `Eksportuj` po prawej stronie obok filtrów, z zachowaniem działania na wąskim ekranie.
- Modal pokazuje przejęty rok i kierunek oraz edytowalny tryb studiów. Zapamiętać zakres otwartego okna, aby zmiana filtrów w tle nie zmieniała trwającego pobierania.
- Dwie pozycje: `Program studiów` oraz `Lista prowadzących ze stopniami i tytułami naukowymi`, każda z własnym przyciskiem `Pobierz`.
- Pobranie przez uwierzytelniony HttpClient jako Blob, nazwa z nagłówka odpowiedzi, zwolnienie URL po pobraniu.
- Sygnalizacja generowania, ochrona przed ponownym kliknięciem tej samej operacji, czytelne błędy API również przy odpowiedzi Blob. Okno pozostaje dostępne do ponowienia próby.

## Kolejność realizacji

1. Ustalić kontrakt danych eksportowych Kadry, kompletność samych przypisań i jednoznaczne dopasowanie sylabusów; opisać przypadki braków.
2. Utworzyć usługę eksportu, klientów źródeł, walidację i autoryzację. Wybrać bibliotekę .NET obsługującą kopiowanie stylów, scalenia i dynamiczne kolumny; przed wyborem sprawdzić zgodność i licencję.
3. Dodać szablony jako wersjonowane zasoby usługi i oba generatory.
4. Dodać modal i pobieranie na frontendzie Kadry.
5. Dodać Dockerfile, konfigurację adresów źródeł, lokalne uruchamianie i routing `/api-export/` w używanych proxy oraz deploymentach.
6. Wykonać testy, buildy oraz ręcznie zweryfikować wynikowe pliki na reprezentatywnych danych.

## Kryteria odbioru

- Dwie osoby prowadzące wykład i trzy prowadzące ćwiczenia dają odpowiednio dwie i trzy pary kolumn we właściwej kolejności. Układ jest poprawny także dla większej liczby osób i wierszy niż w szablonie.
- Podział 10 + 20 godzin między osoby pozostaje podziałem 10 + 20; wspólny wykład dla wielu grup nie jest mnożony przez ich liczbę.
- Te same przedmioty w różnych semestrach, różne kody o tej samej nazwie i różne osoby o tej samej nazwie pozostają rozdzielone.
- Przedmioty z samym przypisaniem osoby trafiają do eksportu bez wymyślonych godzin; przedmioty bez osoby nie trafiają.
- ECTS i godziny programowe odpowiadają właściwemu sylabusowi i trybowi. Braki i niejednoznaczności są widoczne do weryfikacji, nie zamieniane na zera.
- Program zawiera same nazwy prowadzących; osobna lista dodatkowo ich aktualne tytuły i nie powiela osoby między semestrami.
- Filtry izolują rok, kierunek i tryb; zakres statusów jest identyczny jak w Kadrze.
- Testy otwierają wygenerowane XLSX i sprawdzają wartości, typy komórek, położenie kolumn i scalenia; kontrola wizualna obejmuje nagłówki, polskie znaki oraz wydruk szerokiego arkusza.
- Role Kadry mogą pobrać pliki; nieuprawnione role otrzymują odmowę. Błędy źródeł i brak wyników mają czytelną obsługę UI.

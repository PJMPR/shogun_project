# Kadra — plan integracji z backendem

## Ustalenia

- Zestawienie obejmuje wszystkie zapisane plany, robocze i opublikowane. Niezapisane zmiany planisty nie są źródłem danych Kadry.
- Obecnie obsługujemy wyłącznie I stopień. Ukrywamy albo blokujemy filtr poziomu na tej wartości i usuwamy przykładowe dane II stopnia. Nie dodajemy teraz poziomu do bazy planów.
- Odczyt Kadry oraz edycja stopni/tytułów: osoby z dostępem do Dezyderatów, czyli obecnie role `admin` lub `dezyderaty` (`AuthService.canAccessDezyderaty`).
- Uwzględniamy prowadzących bez konta użytkownika.
- Zachowujemy jedno opcjonalne pole tekstowe stopnia/tytułu, wspólne dla osoby i wszystkich lat, zgodnie z wymaganiami mockupu. Bez słownika stopni i osobnego stanowiska.
- Zachowujemy oba widoki, cały rok akademicki, wyszukiwanie oraz zasady obciążenia z `faculty-view-prompt.md`.

## Wynik przeglądu kodu

1. `Shogun.Schedule.Api/ScheduleController.cs` udostępnia `GET /api/v1/schedules?facultyCode=WI&academicYear=2026/2027` oraz `GET /api/v1/schedules/{id}`. Są to lista i szczegóły planów, dostępne obecnie dla `admin,planner`.
2. Nie znaleziono osobnego endpointu gotowej obsady. Widok `frontend/pj-studies-schedule/src/app/schedule/views/list-view/list-view.component.ts` agreguje wpisy pobranych planów we frontendzie.
3. `GET /api/v1/assignments/lecturers` zwraca ostatnie dezyderaty prowadzących, przedmioty i dostępność. Nie zawiera rzeczywistego obciążenia godzinowego, więc może wspierać identyfikację osób, ale nie powinien stanowić źródła godzin Kadry.
4. Dane godzinowe są w `ScheduleEntry`: czas trwania, daty, `MeetingCountOverride`, `StaffingLessonHoursOverride`, prowadzący, forma i grupy. `ScheduleSubjectLecturer` oznacza przypisanie osoby do przedmiotu, ale samo nie określa godzin ani formy zajęć.
5. `ScheduleLecturer` jest lokalny dla planu i nie ma globalnego identyfikatora osoby. Wpisy mogą mieć `LecturerUserId`, e-mail lub samo nazwisko.
6. Planista obecnie scala prowadzących według znormalizowanej nazwy. Kadra nie powinna tego kopiować: dwie osoby o tym samym imieniu i nazwisku muszą mieć osobne tytuły i sumy.
7. Backend nie zapisuje okresu semestru. Frontend planisty używa `semesterTypeOf`: nieparzysty numer oznacza zimę, parzysty lato. W pierwszym etapie Kadra przyjmuje tę samą regułę. Nie rozszerzamy teraz modelu o niezależny okres; jeżeli pojawią się nabory rozpoczynające się latem, będzie potrzebna osobna zmiana.
8. Unikalny indeks planów obejmuje obecnie tylko `(FacultyId, SemesterNumber, StudyMode)`, bez roku akademickiego. Uniemożliwia równoległe plany tej samej kombinacji dla kolejnych lat.
9. Host ma już trasę Kadry chronioną `canAccessDezyderatyGuard`. Proxy lokalne i produkcyjne mają `/api-schedule/`, a frontend Kadry jest jeszcze mockiem bez konfiguracji HTTP.

## Proponowana architektura

Rozszerzyć istniejący `Shogun.Schedule` o API zestawienia Kadry i profile prowadzących. Pozwala to użyć tych samych danych i bazy bez kopiowania planów do nowej usługi. Osobny backend był założeniem mockupu; na obecny zakres rekomendowany jest osobny moduł funkcjonalny wewnątrz usługi planisty.

Frontend Kadry pobiera gotowe, płaskie przydziały z jednego endpointu. Backend oblicza godziny i agreguje wpisy, frontend filtruje wyszukiwanie, grupuje te same wiersze w dwa widoki i liczy sumy widocznych wyników. Nie pobieramy osobno każdego pełnego planu ani komentarzy i notatek.

Nowe endpointy mają własną autoryzację `admin,dezyderaty`. Nie rozszerzamy dostępu do edycji planów w istniejących endpointach planisty.

## Model danych

### Globalny profil prowadzącego

Nowa tabela `lecturer_profiles` w bazie `Shogun.Schedule`:

| Pole | Znaczenie |
| --- | --- |
| `Id` UUID | Trwała tożsamość osoby również bez konta |
| `UserId` nullable | Identyfikator konta Keycloak; unikalny dla wartości niepustych |
| `DisplayName` | Nazwa wyświetlana; bez automatycznego dzielenia na imię i nazwisko |
| `Email` nullable | Dane pomocnicze do identyfikacji, nie klucz główny |
| `AcademicTitle` | Opcjonalny tekst, proponowany limit 200 znaków |
| `ConcurrencyToken` UUID | Ochrona przed nadpisaniem cudzej edycji |
| `CreatedAt`, `UpdatedAt`, `UpdatedByUserId` | Informacja o utworzeniu i ostatniej zmianie |

Stopień/tytuł należy do profilu, nie do planu, dezyderatu ani konkretnego roku. W tym zakresie wystarczy jedna nowa tabela profili zawierająca tytuł; osobna tabela słownika lub historii stopni nie jest potrzebna.

Dodać opcjonalny `LecturerProfileId` do `ScheduleEntry`, `ScheduleLecturer` i `ScheduleSubjectLecturer`. Pozostawić istniejące dane nazwiska/e-maila jako zgodny wstecz zapis źródłowy. Profil nie jest usuwany kaskadowo wraz z planem.

### Powiązanie istniejących osób

1. Wykorzystać identyczny, niepusty `LecturerUserId` do powiązania wpisów z kontem.
2. E-mail wykorzystać tylko przy jednoznacznym dopasowaniu bez sprzecznych identyfikatorów kont; konflikty skierować do ręcznego rozstrzygnięcia.
3. Przy samym nazwisku nie scalać automatycznie osób pomiędzy planami. Utworzyć profile tymczasowo rozdzielone według pochodzenia i przygotować listę możliwych duplikatów do weryfikacji.
4. Planista podczas nowego przypisania wybiera istniejący profil lub tworzy osobę bez konta. Wybór z dezyderatu wiąże z tym samym profilem.
5. Potwierdzone scalenie przepina powiązania; przy różnych zapisanych tytułach wymaga jawnego wyboru wartości. Kontrolowany mechanizm powiązania/scalenia jest częścią etapu identyfikacji, aby nie pozostawić stałych duplikatów.

Nie stosować nazwiska jako identyfikatora w API i nie tworzyć profili przy odczycie GET.

### Plany i wiele lat

Zmienić unikalny indeks na `(FacultyId, AcademicYear, SemesterNumber, StudyMode)`. Dostosować wybór planu w frontendzie planisty do roku — obecnie `loadFor` wybiera według semestru i trybu. Sprawdzić też publikowanie, kontekst kolizji oraz listę opublikowanych planów, aby nie mieszać lat. Poziom studiów pozostaje obecnie stałą I stopień, bez migracji tego pola.

## Proponowane API

Wszystkie poniższe ścieżki należą do `Shogun.Schedule`, przez istniejące proxy `/api-schedule`.

| Metoda i ścieżka | Zachowanie |
| --- | --- |
| `GET /api/v1/faculty/filters` | Dostępne lata i kierunki z bazy; poziom I stopień; tryby |
| `GET /api/v1/faculty/workload?academicYear=2026/2027&facultyCode=WI&studyMode=stationary` | Wszystkie zapisane plany wybranego zakresu, oba okresy; jeden wspólny zestaw przydziałów |
| `GET /api/v1/faculty/lecturers?query=...` | Profile prowadzących obecnych w zapisanych danych planisty, z tytułem i tokenem wersji; modal niezależny od filtrów zestawienia |
| `PATCH /api/v1/faculty/lecturers/academic-titles` | Atomowy zapis zmienionych pozycji `{ lecturerId, academicTitle, concurrencyToken }`; zwraca nowe wartości i tokeny |

Odpowiedź obciążenia zawiera słownik osób (`id`, `displayName`, `academicTitle`), przedmiotów (`id`, `code`, `name`) oraz przydziały: `lecturerId`, `subjectId`, `academicYear`, `facultyCode`, `studyLevel` = I stopień, `studyMode`, `semesterNumber`, `semesterSeason`, `classType` i `workloadHours`. Identyfikator przedmiotu opiera się na tożsamości źródłowej/kodzie w zakresie kierunku, a nie wyłącznie nazwie. Przy braku kodu/ID zachowujemy tożsamość lokalną dla planu.

Walidacja: poprawny rok, znany kierunek i tryb, istniejący profil, limit długości tytułu, unikalne osoby w partii. Pusty lub biały tekst czyści tytuł. Konflikt wersji: HTTP 409 i brak częściowego zapisu partii; frontend zachowuje roboczą kopię. Błędy 401/403 są obsługiwane osobno od pustego zestawienia.

## Reguły obciążenia

- Jednostka: godzina lekcyjna 45 minut, zgodnie z obecnym planistą. UI powinno to wyjaśniać.
- Gdy `StaffingLessonHoursOverride > 0`, użyć tej wartości jako obciążenia pojedynczego wpisu.
- W przeciwnym razie: `DurationMinutes / 45 × liczba spotkań`.
- Liczba spotkań: `MeetingCountOverride`, jeśli podane; następnie liczba zapisanych dat; następnie obecne wartości domyślne planisty: 15 dla stacjonarnych, 8 dla niestacjonarnych. Jawne 0 spotkań pozostaje zerem. Wartość 0 nadpisania godzin oznacza obecnie tryb automatyczny.
- Liczyć każdy wpis raz, niezależnie od liczby jego grup. Osobne cykle zajęć zapisane jako osobne wpisy sumować.
- `Lecture` mapować na wykład, wszystkie pozostałe formy na ćwiczenia.
- Agregować według osoby, przedmiotu, roku, kierunku, trybu, semestru i formy wynikowej. Nie scalać różnych semestrów lub trybów.
- Uwzględnić wpisy ukryte w widoku opublikowanym, zgodnie z pełną obsadą planisty; ukrycie nie usuwa obciążenia z zapisanych danych.
- Wpis bez przypisanej osoby nie zwiększa obciążenia konkretnego prowadzącego; zwrócić liczbę takich wpisów jako informację o kompletności zestawienia.
- Same przypisania `ScheduleSubjectLecturer` bez wpisów zajęć nie generują godzin. Osoba może występować w modalu z zerowym obciążeniem.
- Nie zaokrąglać przed sumowaniem. Wyświetlać maksymalnie dwa miejsca po przecinku.

Obecną logikę obliczania godzin przenieść do serwisu aplikacyjnego backendu; następnie podłączyć zapisany zakres obsady planisty do tej samej logiki. Planista może nadal wyświetlać niezapisane zmiany lokalne, ale Kadra pokazuje stan bazy.

## Kolejność wdrożenia

1. Dodać profile, powiązania, migrację identyfikacji i raport niejednoznacznych dopasowań. Uzupełnić wybór prowadzącego w planiście o profil osoby bez konta.
2. Poprawić unikalność planów i wybór roku w planiście. Migrację identyfikacji sprawdzić na kopii istniejących danych.
3. Dodać serwis obciążenia, zapytanie pobierające tylko potrzebne pola oraz nowe endpointy z autoryzacją `admin,dezyderaty`.
4. Zastąpić mocki Kadry klientem HTTP przez `/api-schedule`; wykorzystać uwierzytelniony `HttpClient` hosta. Zweryfikować osobno uruchomienie MFE bez hosta — obecna konfiguracja Kadry nie zapewnia logowania.
5. Zmienić modele i grupowanie UI na stabilne ID, zachować nazwy wyświetlane. Pobierać lata/kierunki z API; pozostawić jedynie I stopień. Dodać stany ładowania, błędu i pustych wyników oraz zabezpieczenie przed odpowiedzią dla nieaktualnych filtrów.
6. Podłączyć modal: kopia robocza, wysyłanie tylko zmian, zamknięcie po udanym zapisie, zachowanie edycji po błędzie. Usunąć informację o zapisie wyłącznie w pamięci.
7. Sprawdzić oba widoki, dostęp przez hosta i istniejące proxy lokalne/produkcyjne. Nie jest potrzebny nowy kontener ani nowa baza dla rekomendowanej architektury.

## Weryfikacja

- Testy serwisu: wspólny wykład 30 h dla trzech grup daje 30 h; trzy osobne cykle po 30 h dają 90 h; podział 10 + 20 h zachowuje dwie osoby i sumę 30 h.
- Daty, domyślne liczby spotkań, oba nadpisania i zero spotkań zachowują reguły planisty; formy inne niż wykład trafiają do ćwiczeń.
- Roczne zestawienie uwzględnia obie pory i plany robocze, izoluje kierunki/tryby/lata, sumuje wyłącznie zapisane dane.
- Dwie osoby o tym samym nazwisku pozostają oddzielne. Osoba bez konta zachowuje tytuł po odświeżeniu i po późniejszym powiązaniu konta.
- Zapis tytułów jest atomowy, czyści pole i wykrywa równoległą edycję.
- API pozwala na odczyt i zapis dla `admin,dezyderaty`, odmawia innym rolom i nie otwiera edycji planów.
- Migracja umożliwia dwa lata tej samej kombinacji planu; wybór i publikacja nie mieszają lat.
- Build zmienionych projektów .NET i Angular oraz celowane testy aplikacyjne/integracyjne. Eksport XLSX pozostaje osobnym etapem.

## Status

Plan oparty na przeglądzie lokalnego kodu i odpowiedziach użytkownika. W tym etapie powstaje dokument planu; implementacja backendu, migracje i zmiany frontendu nie zostały wykonane. Wariant rozszerzenia `Shogun.Schedule`, stały tytuł niezależny od roku i parzystość semestrów są jawnymi założeniami projektu opisanymi powyżej.

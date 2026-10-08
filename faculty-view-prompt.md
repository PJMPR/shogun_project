# Plan mockupu: pj-studies-faculty

## Cel

Przygotuj kolejny mikrofrontend Angular o nazwie `pj-studies-faculty`, umożliwiający przegląd kadry i jej obciążenia dydaktycznego w wybranym roku akademickim. Użyj PrimeNG i dopasuj wygląd oraz integrację do pozostałych mikrofrontendów w repozytorium.

Obecny etap obejmuje działający mockup z przykładowymi danymi. Docelowo mikrofrontend będzie korzystał z osobnego backendu, ale teraz nie implementuj backendu ani połączeń HTTP.

## Ustalone wymagania

- Dwa widoki tych samych danych: według wykładowcy i według przedmiotu.
- W obu widokach pokazuj cały rok akademicki: semestry zimowe i letnie jednocześnie.
- Wspólne filtry: kierunek, poziom studiów, rok akademicki i tryb studiów.
- Kierunki: Informatyka oraz Sztuka Nowych Mediów.
- Poziomy: I stopień oraz II stopień.
- Tryby: stacjonarny oraz niestacjonarny.
- Rozróżniaj wyłącznie dwie formy zajęć: wykład i ćwiczenia. Wszystkie formy inne niż wykład traktuj jako ćwiczenia.
- Jeden przedmiot może prowadzić kilku wykładowców, również w obrębie tej samej formy zajęć.
- Pokazuj sumaryczne godziny danego prowadzącego dla przedmiotu, formy zajęć i semestru. Nie pokazuj szczegółów grup ani przydziałów do grup.
- Zapewnij modal do edycji jednego pola stopnia/tytułu naukowego każdego wykładowcy.
- Zmiany w modalu mogą znikać po odświeżeniu strony.
- Eksport do Excela będzie osobnym etapem.

## Zasady godzin i semestrów

Godziny oznaczają faktyczne obciążenie wykładowcy, a nie sam wymiar przedmiotu z programu studiów.

- Ćwiczenia prowadzone przez jednego wykładowcę przez 30 godzin dla każdej z trzech grup dają 90 godzin obciążenia.
- Wspólny wykład prowadzony jednocześnie dla trzech grup przez 30 godzin daje 30 godzin obciążenia.
- Trzy osobne cykle wykładu po 30 godzin dają 90 godzin obciążenia.
- Jeśli jeden prowadzący realizuje 10 godzin wykładu z przedmiotu, a drugi 20, pokaż dwa przydziały: odpowiednio 10 i 20 godzin. Łączna wartość dla tego wykładu wynosi 30 godzin.
- Przechowuj w mockach gotowe wartości obciążenia. Nie mnoż ich ponownie przez liczbę grup i nie buduj interfejsu zarządzania grupami.
- Rozróżniaj numer semestru studiów oraz jego okres: zimowy lub letni. Nie utożsamiaj numeru semestru z rokiem akademickim.
- Nie łącz automatycznie przydziałów z różnych semestrów, poziomów, kierunków ani trybów.

## Układ ekranu

### Nagłówek i filtry

Tytuł ekranu: „Kadra”. Krótki opis wskazuje, że zestawienie obejmuje obciążenie dydaktyczne całego roku akademickiego.

W górnej części umieść:

1. Wybór roku akademickiego.
2. Wybór kierunku.
3. Wybór poziomu studiów.
4. Wybór trybu studiów.
5. Przycisk „Stopnie i tytuły naukowe”.

Użyj kontrolek PrimeNG zgodnych z wersją zainstalowaną w projekcie. Filtry mają działać wspólnie i pozostawać zachowane podczas przełączania widoków. W mockupie wybierz sensowne wartości początkowe z dostępnych danych.

### Widok „Według wykładowcy”

Tabela z grupowaniem według wykładowcy. Nagłówek grupy pokazuje imię, nazwisko, stopień/tytuł oraz sumę godzin w aktualnie wyfiltrowanym zestawieniu.

Kolumny szczegółów:

- Przedmiot.
- Forma zajęć: wykład lub ćwiczenia.
- Semestr studiów.
- Okres: zimowy lub letni.
- Liczba godzin obciążenia.

Każdy wiersz przedstawia sumaryczny przydział konkretnego wykładowcy do przedmiotu, formy i semestru, bez rozpisywania grup.

### Widok „Według przedmiotu”

Tabela z grupowaniem według przedmiotu. Nagłówek grupy pokazuje nazwę przedmiotu oraz sumę godzin obciążenia prowadzących w aktualnie wyfiltrowanym zestawieniu.

Kolumny szczegółów:

- Wykładowca wraz ze stopniem/tytułem.
- Forma zajęć: wykład lub ćwiczenia.
- Semestr studiów.
- Okres: zimowy lub letni.
- Liczba godzin obciążenia.

Zachowaj osobne wiersze dla prowadzących dzielących ten sam wykład lub ćwiczenia. Sumę opisuj jako obciążenie prowadzących, aby nie sugerować, że jest wymiarem przedmiotu dla pojedynczej grupy.

### Zachowania wspólne

- Przełączanie widoków przez zakładki lub kontrolkę zgodną z istniejącą aplikacją.
- Wyszukiwanie po nazwisku wykładowcy i nazwie przedmiotu.
- Czytelne oznaczenia formy zajęć i okresu semestru.
- Stan pusty z komunikatem o braku wyników dla wybranych filtrów.
- Sumy wyliczane z aktualnie widocznego zestawu danych po filtrowaniu i wyszukiwaniu.
- Czytelny układ na mniejszych ekranach, z przewijaniem tabeli, jeśli to potrzebne.

## Modal „Stopnie i tytuły naukowe”

Otwieraj modal przyciskiem z nagłówka. Pokaż listę wykładowców z wyszukiwaniem po imieniu i nazwisku oraz jednym edytowalnym polem tekstowym dla każdej osoby, np. „dr”, „dr hab. inż.” lub „prof. dr hab.”.

- Pole może pozostać puste.
- Nie dodawaj oddzielnego pola stanowiska ani słownika stopni.
- „Zapisz” aktualizuje dane w pamięci i natychmiast odświeża obie zakładki.
- „Anuluj” i zamknięcie modalu odrzucają niezapisane zmiany; edytuj roboczą kopię danych.
- Przyjmij jako założenie mockupu, że stopień/tytuł jest właściwością wykładowcy wspólną dla wszystkich przykładowych lat.
- Nie używaj localStorage ani backendu. Odświeżenie strony przywraca dane początkowe.
- Zapewnij etykiety pól, obsługę klawiatury oraz poprawne zarządzanie fokusem przez komponent dialogu PrimeNG.

## Model danych mockupu

Oddziel dane źródłowe od komponentów prezentacyjnych. Proponowane encje:

### Wykładowca

- `id` — stabilny identyfikator.
- `firstName` — imię.
- `lastName` — nazwisko.
- `academicTitle` — jedno edytowalne pole stopnia/tytułu, dopuszczające pusty tekst.

### Przedmiot

- `id` — stabilny identyfikator.
- `name` — nazwa przedmiotu.

### Przydział dydaktyczny

- `id` — identyfikator przydziału.
- `lecturerId` — powiązanie z wykładowcą.
- `subjectId` — powiązanie z przedmiotem.
- `academicYear` — rok akademicki, np. `2026/2027`.
- `fieldOfStudy` — Informatyka albo Sztuka Nowych Mediów.
- `studyLevel` — I albo II stopień.
- `studyMode` — stacjonarny albo niestacjonarny.
- `semesterNumber` — numer semestru studiów.
- `semesterSeason` — zimowy albo letni.
- `classType` — wykład albo ćwiczenia.
- `workloadHours` — gotowe, sumaryczne obciążenie prowadzącego w godzinach dla danego przydziału.

Obie zakładki korzystają z jednego źródła przydziałów. Grupowanie i sumy są danymi pochodnymi; nie utrzymuj niezależnych, ręcznie zsynchronizowanych zestawów dla obu widoków.

## Przykładowe dane

Przygotuj fikcyjne osoby i realistyczne przedmioty. Dane mają pozwalać sprawdzić:

- Oba kierunki, oba poziomy i oba tryby studiów.
- Co najmniej dwa lata akademickie, żeby zweryfikować filtr roku.
- Semestry zimowe i letnie w jednym wybranym roku.
- Kilku prowadzących jeden przedmiot.
- Podział wykładu na 10 i 20 godzin między dwie osoby.
- Prowadzącego mającego wykład i ćwiczenia z tego samego przedmiotu.
- Ćwiczenia z obciążeniem 90 godzin, odpowiadającym trzem osobnym grupom po 30 godzin, bez zapisywania szczegółów grup.
- Wspólny wykład z obciążeniem 30 godzin.
- Wykładowców z różnymi stopniami oraz osobę z pustym polem stopnia/tytułu.
- Kombinację filtrów bez wyników.

## Plan implementacji

1. Przeczytaj obowiązujące `AGENTS.md`. Sprawdź istniejące mikrofrontendy, wersje Angular i PrimeNG, motyw, style, nawigację oraz mechanizm integracji z hostem. Nie zakładaj z góry konkretnego mechanizmu federacji ani struktury katalogów.
2. Utwórz `pj-studies-faculty` według wzorca istniejących mikrofrontendów. Wykorzystaj zgodne wersje zależności i istniejące elementy wspólne.
3. Dodaj minimalną integrację z hostem i pozycję „Kadra” w odpowiednim miejscu nawigacji. Zachowaj istniejące zasady dostępu i sposób uruchamiania aplikacji.
4. Przygotuj typy, przykładowe dane i lokalny serwis lub magazyn stanu, który później będzie można zastąpić integracją z osobnym backendem.
5. Zaimplementuj wspólne filtrowanie, wyszukiwanie, grupowanie i obliczanie sum.
6. Zbuduj obie zakładki z komponentów PrimeNG i dopasuj odstępy, kolory, typografię, przyciski oraz tabele do aplikacji.
7. Dodaj modal edycji stopni/tytułów z zapisem w pamięci i anulowaniem zmian.
8. Zweryfikuj działanie, spójność wizualną i integrację. Uruchom właściwe dla repozytorium sprawdzenia i build. Dodaj lub uruchom celowane testy logiki obciążenia oraz filtrowania, jeżeli istniejąca infrastruktura to umożliwia.
9. Uzupełnij dokumentację uruchomienia nowego mikrofrontendu według konwencji repozytorium. Zaznacz, że dane są przykładowe, a backend i eksport należą do późniejszego etapu.

## Poza zakresem

- Osobny backend, baza danych i kontrakt API.
- Pobieranie rzeczywistych danych kadrowych.
- Eksport XLSX oraz generowanie plików. Nie dodawaj pozornie działających przycisków eksportu; ich projekt i implementację pozostaw na później.
- Edycja przydziałów, godzin, przedmiotów i grup.
- Szczegółowy podział zajęć na grupy.
- Trwałe zapisywanie zmian stopni/tytułów.
- Przebudowa pozostałych mikrofrontendów lub motywu aplikacji.

## Kryteria odbioru

- `pj-studies-faculty` uruchamia się i jest dostępny z hosta zgodnie z architekturą projektu.
- Wygląd jest spójny z istniejącą aplikacją i korzysta z PrimeNG.
- Wszystkie cztery filtry działają równocześnie i zachowują wartości przy przełączaniu zakładek.
- Obie zakładki przedstawiają te same przydziały, tylko inaczej pogrupowane.
- Dla wybranego roku widoczne są dane zimowe i letnie, bez konieczności przełączania okresu.
- Podział wykładu na 10 i 20 godzin pozostaje widoczny przy właściwych prowadzących, a suma wynosi 30 godzin.
- Obciążenie ćwiczeń 90 godzin oraz wspólnego wykładu 30 godzin nie jest ponownie mnożone przez liczbę grup.
- Sumy odpowiadają aktualnie wyfiltrowanym i wyszukanym przydziałom.
- Modal zapisuje stopień/tytuł w obu widokach, anulowanie odrzuca zmiany, a odświeżenie przywraca dane mockowe.
- Puste wyniki mają czytelny komunikat.
- Mockup działa bez backendu i bez żądań API dotyczących kadry.

## Status planu

Wymagania funkcjonalne ustalono z użytkownikiem. Szczegóły integracji i istniejące wzorce wizualne wymagają weryfikacji w repozytorium przed implementacją; podczas przygotowania tego dokumentu narzędzia odczytu środowiska zgłaszały błędy.

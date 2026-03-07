import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const syllabusDir = join(__dirname, '..', 'public', 'assets', 'syllabusy');

// Dane dla każdego przedmiotu: kryteria_oceny (wyklad/cwiczenia_laboratorium) + metody_dydaktyczne + praca_wlasna_studenta
const subjectData = {
  'AAI.json': {
    kryteria_oceny: {
      wyklad: ['kolokwium końcowe'],
      cwiczenia_laboratorium: ['ocena pracy podczas ćwiczenia', 'ocena sporządzonego oprogramowania', 'prezentacja mini-projektu']
    },
    metody_dydaktyczne: {
      wyklad: ['wykład z prezentacją multimedialną', 'wykład z prezentacją oprogramowania'],
      cwiczenia_laboratorium: ['rozwiązywanie zadań', 'studia przypadków z bazy studiów przypadków opracowanych przez firmy MŚP lub będące efektem staży', 'praca grupowa nad projektem z wykorzystaniem nowoczesnych technik informatycznych']
    },
    praca_wlasna_studenta: 'Samodzielne rozwiązywanie zadań programistycznych w środowisku Google Colab Notebooks; implementacja i eksperymentowanie z algorytmami AI; przygotowanie mini-projektu zaliczeniowego.'
  },
  'ADM.json': {
    kryteria_oceny: {
      wyklad: [],
      cwiczenia_laboratorium: ['kolokwium', 'ocena pracy podczas ćwiczenia', 'raport z wykonanego zadania']
    },
    metody_dydaktyczne: {
      wyklad: ['wykład z prezentacją multimedialną', 'wykład z prezentacją oprogramowania'],
      cwiczenia_laboratorium: ['rozwiązywanie zadań', 'warsztaty', 'praca w grupach']
    },
    praca_wlasna_studenta: 'Samodzielna konfiguracja środowiska wirtualnego z systemem Windows Server; wykonywanie zadań administracyjnych (Active Directory, GPO, DNS, DHCP) poza zajęciami; przygotowanie sprawozdań z laboratoriów.'
  },
  'AIC.json': {
    kryteria_oceny: {
      wyklad: [],
      cwiczenia_laboratorium: ['kolokwium końcowe', 'rezultaty gry strategicznej', 'raport z wykonanego zadania']
    },
    metody_dydaktyczne: {
      wyklad: ['wykład z prezentacją multimedialną', 'wykład konwersatoryjny (z elementami dyskusji)'],
      cwiczenia_laboratorium: ['warsztaty', 'studia przypadków z bazy studiów przypadków opracowanych przez firmy MŚP lub będące efektem staży', 'rozwiązywanie zadań']
    },
    praca_wlasna_studenta: 'Analiza rzeczywistych przypadków incydentów cyberbezpieczeństwa; przygotowanie raportu z analizy wybranego incydentu; samodzielne ćwiczenia z narzędziami do analizy zagrożeń.'
  },
  'ALG.json': {
    kryteria_oceny: {
      wyklad: [],
      cwiczenia_laboratorium: ['kolokwium', 'sprawdziany wstępne „wejściówki"']
    },
    metody_dydaktyczne: {
      wyklad: [],
      cwiczenia_laboratorium: ['rozwiązywanie zadań', 'dyskusja']
    },
    praca_wlasna_studenta: 'Samodzielne rozwiązywanie zadań z algebry liniowej i geometrii analitycznej; powtórzenie materiału przed kolokwiami; ćwiczenie obliczeń macierzowych i wektorowych.'
  },
  'AMM.json': {
    kryteria_oceny: {
      wyklad: ['egzamin pisemny z zadaniami problemowymi'],
      cwiczenia_laboratorium: ['raport z wykonanego zadania', 'prezentacja projektu i dokumentacji', 'obrona projektu']
    },
    metody_dydaktyczne: {
      wyklad: ['wykład z prezentacją multimedialną', 'wykład z prezentacją oprogramowania'],
      cwiczenia_laboratorium: ['metoda projektów (projekt praktyczny)', 'rozwiązywanie zadań', 'praca w grupach']
    },
    praca_wlasna_studenta: 'Projektowanie i implementacja mikroserwisów oraz mikrofrontendów z użyciem Docker, Kubernetes i Module Federation; dokumentacja architektury systemu; przygotowanie projektu końcowego.'
  },
  'AMs.json': {
    kryteria_oceny: {
      wyklad: [],
      cwiczenia_laboratorium: ['kolokwium', 'sprawdziany wstępne „wejściówki"']
    },
    metody_dydaktyczne: {
      wyklad: [],
      cwiczenia_laboratorium: ['rozwiązywanie zadań', 'dyskusja']
    },
    praca_wlasna_studenta: 'Samodzielne rozwiązywanie zadań z analizy matematycznej; przygotowanie do kolokwiów poprzez ćwiczenie obliczeń granic, pochodnych i całek; korzystanie z materiałów dydaktycznych.'
  },
  'ANG1-3.json': {
    kryteria_oceny: {
      wyklad: [],
      cwiczenia_laboratorium: ['kolokwium', 'egzamin ustny', 'ocena sporządzonego dokumentu']
    },
    metody_dydaktyczne: {
      wyklad: [],
      cwiczenia_laboratorium: ['analiza tekstów z dyskusją', 'rozwiązywanie zadań', 'burza mózgów', 'mind map', 'praca grupowa nad projektem z wykorzystaniem nowoczesnych technik informatycznych', 'warsztaty']
    },
    praca_wlasna_studenta: 'Przygotowywanie prac pisemnych (listy formalne/nieformalne, eseje, raporty); nauka słownictwa i gramatyki; przygotowanie do kolokwiów i testów; samodzielne ćwiczenia z wymową i konwersacją.'
  },
  'ANG1.json': {
    kryteria_oceny: {
      wyklad: [],
      cwiczenia_laboratorium: ['kolokwium', 'egzamin ustny', 'ocena sporządzonego dokumentu']
    },
    metody_dydaktyczne: {
      wyklad: [],
      cwiczenia_laboratorium: ['analiza tekstów z dyskusją', 'rozwiązywanie zadań', 'burza mózgów', 'praca grupowa nad projektem z wykorzystaniem nowoczesnych technik informatycznych', 'warsztaty']
    },
    praca_wlasna_studenta: 'Nauka słownictwa i gramatyki języka angielskiego; przygotowywanie prac pisemnych; przygotowanie do kolokwiów i testów; samodzielne ćwiczenia konwersacyjne i komunikacyjne.'
  },
  'ANG2.json': {
    kryteria_oceny: {
      wyklad: [],
      cwiczenia_laboratorium: ['kolokwium', 'egzamin ustny', 'ocena sporządzonego dokumentu']
    },
    metody_dydaktyczne: {
      wyklad: [],
      cwiczenia_laboratorium: ['analiza tekstów z dyskusją', 'rozwiązywanie zadań', 'burza mózgów', 'praca grupowa nad projektem z wykorzystaniem nowoczesnych technik informatycznych', 'warsztaty']
    },
    praca_wlasna_studenta: 'Nauka słownictwa i gramatyki języka angielskiego; przygotowywanie prac pisemnych; przygotowanie do kolokwiów i testów; samodzielne ćwiczenia konwersacyjne i komunikacyjne.'
  },
  'ANG3.json': {
    kryteria_oceny: {
      wyklad: [],
      cwiczenia_laboratorium: ['kolokwium', 'egzamin ustny', 'ocena sporządzonego dokumentu']
    },
    metody_dydaktyczne: {
      wyklad: [],
      cwiczenia_laboratorium: ['analiza tekstów z dyskusją', 'rozwiązywanie zadań', 'burza mózgów', 'praca grupowa nad projektem z wykorzystaniem nowoczesnych technik informatycznych', 'warsztaty']
    },
    praca_wlasna_studenta: 'Nauka słownictwa i gramatyki języka angielskiego; przygotowywanie prac pisemnych; przygotowanie do kolokwiów i testów; samodzielne ćwiczenia konwersacyjne i komunikacyjne.'
  },
  'ANK.json': {
    kryteria_oceny: {
      wyklad: [],
      cwiczenia_laboratorium: ['ocena sporządzonego oprogramowania', 'prezentacja samodzielnej pracy semestralnej']
    },
    metody_dydaktyczne: {
      wyklad: ['wykład z prezentacją multimedialną', 'wykład konwersatoryjny (z elementami dyskusji)'],
      cwiczenia_laboratorium: ['metoda projektów (projekt praktyczny)', 'warsztaty', 'studia przypadków z bazy studiów przypadków opracowanych przez firmy MŚP lub będące efektem staży']
    },
    praca_wlasna_studenta: 'Samodzielna praca nad ćwiczeniami animacyjnymi; budowanie portfolio semestralnego; praca nad projektem końcowym z animacji komputerowej; eksperymentowanie z technikami animacji.'
  },
  'ASD.json': {
    kryteria_oceny: {
      wyklad: ['egzamin pisemny z zadaniami problemowymi'],
      cwiczenia_laboratorium: ['kolokwium', 'sprawdziany wstępne „wejściówki"']
    },
    metody_dydaktyczne: {
      wyklad: ['wykład z prezentacją multimedialną', 'wykład konwersatoryjny (z elementami dyskusji)'],
      cwiczenia_laboratorium: ['rozwiązywanie zadań', 'dyskusja']
    },
    praca_wlasna_studenta: 'Implementacja algorytmów i struktur danych w wybranym języku programowania; analiza złożoności obliczeniowej; przygotowanie do kolokwiów i egzaminu poprzez rozwiązywanie zadań.'
  },
  'BSI.json': {
    kryteria_oceny: {
      wyklad: ['kolokwium'],
      cwiczenia_laboratorium: ['ocena pracy podczas ćwiczenia', 'raport z wykonanego zadania']
    },
    metody_dydaktyczne: {
      wyklad: ['wykład z prezentacją multimedialną', 'wykład konwersatoryjny (z elementami dyskusji)'],
      cwiczenia_laboratorium: ['rozwiązywanie zadań', 'studia przypadków z bazy studiów przypadków opracowanych przez firmy MŚP lub będące efektem staży', 'warsztaty']
    },
    praca_wlasna_studenta: 'Samodzielne ćwiczenia z analizy podatności systemów informacyjnych; przygotowanie do kolokwiów; analiza przypadków naruszeń bezpieczeństwa; konfiguracja narzędzi ochrony.'
  },
  'BYT.json': {
    kryteria_oceny: {
      wyklad: ['egzamin pisemny z zadaniami problemowymi'],
      cwiczenia_laboratorium: []
    },
    metody_dydaktyczne: {
      wyklad: ['wykład z prezentacją multimedialną', 'wykład konwersatoryjny (z elementami dyskusji)'],
      cwiczenia_laboratorium: []
    },
    praca_wlasna_studenta: 'Studiowanie materiałów z zakresu budowy i integracji systemów informatycznych; przygotowanie do egzaminu pisemnego; analiza dokumentacji technicznej i architektonicznych wzorców integracji.'
  },
  'COV.json': {
    kryteria_oceny: {
      wyklad: [],
      cwiczenia_laboratorium: ['ocena sporządzonego oprogramowania', 'prezentacja projektu i dokumentacji', 'raport z wykonanego zadania']
    },
    metody_dydaktyczne: {
      wyklad: ['wykład z prezentacją multimedialną', 'wykład z prezentacją oprogramowania'],
      cwiczenia_laboratorium: ['rozwiązywanie zadań', 'metoda projektów (projekt praktyczny)', 'praca w grupach']
    },
    praca_wlasna_studenta: 'Rozwiązywanie zadań w Google Colab z zakresu Computer Vision; praca nad projektem zespołowym; implementacja algorytmów detekcji i rozpoznawania obrazów; przygotowanie prezentacji posterowej.'
  },
  'CPP.json': {
    kryteria_oceny: {
      wyklad: [],
      cwiczenia_laboratorium: ['kolokwium', 'ocena sporządzonego oprogramowania', 'prezentacja mini-projektu']
    },
    metody_dydaktyczne: {
      wyklad: ['wykład z prezentacją multimedialną', 'wykład z prezentacją oprogramowania'],
      cwiczenia_laboratorium: ['rozwiązywanie zadań', 'warsztaty', 'metoda projektów (projekt praktyczny)']
    },
    praca_wlasna_studenta: 'Samodzielne programowanie w C/C++; rozwiązywanie zadań programistycznych; przygotowanie mini-projektów; nauka zarządzania pamięcią i wskaźnikami.'
  },
  'DDO.json': {
    kryteria_oceny: {
      wyklad: [],
      cwiczenia_laboratorium: ['prezentacja projektu i dokumentacji', 'ocena sporządzonego oprogramowania']
    },
    metody_dydaktyczne: {
      wyklad: ['wykład z prezentacją multimedialną', 'wykład z prezentacją oprogramowania'],
      cwiczenia_laboratorium: ['metoda projektów (projekt praktyczny)', 'rozwiązywanie zadań']
    },
    praca_wlasna_studenta: 'Projektowanie modelu danych w bazie dokumentowej (MongoDB/CouchDB); implementacja operacji CRUD i zapytań; przygotowanie dokumentacji projektu.'
  },
  'DEV.json': {
    kryteria_oceny: {
      wyklad: ['kolokwium końcowe'],
      cwiczenia_laboratorium: ['ocena pracy podczas ćwiczenia', 'ocena sporządzonego oprogramowania', 'raport z wykonanego zadania']
    },
    metody_dydaktyczne: {
      wyklad: ['wykład z prezentacją multimedialną', 'wykład konwersatoryjny (z elementami dyskusji)'],
      cwiczenia_laboratorium: ['rozwiązywanie zadań', 'metoda projektów (projekt praktyczny)', 'studia przypadków z bazy studiów przypadków opracowanych przez firmy MŚP lub będące efektem staży']
    },
    praca_wlasna_studenta: 'Konfiguracja pipeline CI/CD w środowisku chmurowym; praca z narzędziami DevOps (Docker, Jenkins, GitLab CI); przygotowanie do kolokwium z zagadnień DevOps.'
  },
  'DGR.json': {
    kryteria_oceny: {
      wyklad: [],
      cwiczenia_laboratorium: ['prezentacja projektu i dokumentacji', 'ocena sporządzonego oprogramowania']
    },
    metody_dydaktyczne: {
      wyklad: ['wykład z prezentacją multimedialną', 'wykład z prezentacją oprogramowania'],
      cwiczenia_laboratorium: ['metoda projektów (projekt praktyczny)', 'rozwiązywanie zadań']
    },
    praca_wlasna_studenta: 'Projektowanie modelu grafowego bazy danych (Neo4j); implementacja zapytań grafowych; przygotowanie dokumentacji projektu; analiza relacji w danych.'
  },
  'DL.json': {
    kryteria_oceny: {
      wyklad: [],
      cwiczenia_laboratorium: ['ocena sporządzonego oprogramowania', 'prezentacja samodzielnej pracy semestralnej', 'raport z wykonanego zadania']
    },
    metody_dydaktyczne: {
      wyklad: ['wykład z prezentacją multimedialną', 'wykład z prezentacją oprogramowania'],
      cwiczenia_laboratorium: ['rozwiązywanie zadań', 'metoda projektów (projekt praktyczny)', 'praca w grupach']
    },
    praca_wlasna_studenta: 'Samodzielne rozwiązywanie zadań w Google Colab z zakresu deep learning; przygotowanie prezentacji seminaryjnej dotyczącej wybranego zagadnienia z obszaru uczenia głębokiego.'
  },
  'DOT.json': {
    kryteria_oceny: {
      wyklad: [],
      cwiczenia_laboratorium: ['ocena pracy podczas ćwiczenia', 'ocena sporządzonego oprogramowania']
    },
    metody_dydaktyczne: {
      wyklad: ['wykład z prezentacją multimedialną', 'wykład z prezentacją oprogramowania'],
      cwiczenia_laboratorium: ['rozwiązywanie zadań', 'metoda projektów (projekt praktyczny)']
    },
    praca_wlasna_studenta: 'Samodzielne rozwiązywanie zadań programistycznych w technologii .NET; implementacja projektów z użyciem ASP.NET Core, Entity Framework; przygotowanie do zadań laboratoryjnych.'
  },
  'DSL.json': {
    kryteria_oceny: {
      wyklad: [],
      cwiczenia_laboratorium: ['prezentacja projektu i dokumentacji', 'ocena sporządzonego oprogramowania']
    },
    metody_dydaktyczne: {
      wyklad: ['wykład z prezentacją multimedialną', 'wykład z prezentacją oprogramowania'],
      cwiczenia_laboratorium: ['metoda projektów (projekt praktyczny)', 'rozwiązywanie zadań']
    },
    praca_wlasna_studenta: 'Projektowanie modelu danych w słownikowej bazie danych (Redis/DynamoDB); implementacja operacji wyszukiwania i zarządzania danymi; dokumentacja projektu.'
  },
  'DTH.json': {
    kryteria_oceny: {
      wyklad: [],
      cwiczenia_laboratorium: ['prezentacja projektu i dokumentacji', 'ocena pracy podczas ćwiczenia']
    },
    metody_dydaktyczne: {
      wyklad: ['wykład z prezentacją multimedialną'],
      cwiczenia_laboratorium: ['metoda projektów (projekt praktyczny)', 'praca w grupach', 'burza mózgów']
    },
    praca_wlasna_studenta: 'Samodzielna praca nad projektem z zastosowaniem metod Design Thinking; tworzenie person, map empatii i prototypów rozwiązań; przygotowanie dokumentacji projektu.'
  },
  'ELK.json': {
    kryteria_oceny: {
      wyklad: ['kolokwium'],
      cwiczenia_laboratorium: ['raport z wykonanego zadania', 'ocena pracy podczas ćwiczenia']
    },
    metody_dydaktyczne: {
      wyklad: ['wykład z prezentacją multimedialną', 'wykład konwersatoryjny (z elementami dyskusji)'],
      cwiczenia_laboratorium: ['rozwiązywanie zadań', 'warsztaty']
    },
    praca_wlasna_studenta: 'Przygotowanie sprawozdań z ćwiczeń laboratoryjnych z elektroniki; samodzielne analizy układów elektronicznych; przygotowanie do kolokwium.'
  },
  'FDL.json': {
    kryteria_oceny: {
      wyklad: [],
      cwiczenia_laboratorium: ['ocena sporządzonego oprogramowania', 'prezentacja samodzielnej pracy semestralnej']
    },
    metody_dydaktyczne: {
      wyklad: ['wykład z prezentacją multimedialną', 'wykład z prezentacją oprogramowania'],
      cwiczenia_laboratorium: ['rozwiązywanie zadań', 'metoda projektów (projekt praktyczny)', 'praca w grupach']
    },
    praca_wlasna_studenta: 'Samodzielne rozwiązywanie zadań w Google Colab dotyczących nowoczesnych metod uczenia głębokiego; przygotowanie prezentacji seminaryjnej na wybrany temat badawczy z dziedziny DL.'
  },
  'FIZ.json': {
    kryteria_oceny: {
      wyklad: ['kolokwium'],
      cwiczenia_laboratorium: ['kolokwium', 'raport z wykonanego zadania']
    },
    metody_dydaktyczne: {
      wyklad: ['wykład z prezentacją multimedialną'],
      cwiczenia_laboratorium: ['rozwiązywanie zadań', 'burza mózgów']
    },
    praca_wlasna_studenta: 'Przygotowanie sprawozdań z doświadczeń fizycznych; samodzielne rozwiązywanie zadań rachunkowych; powtórzenie materiału przed kolokwiami.'
  },
  'GRK.json': {
    kryteria_oceny: {
      wyklad: ['egzamin pisemny - test wyboru'],
      cwiczenia_laboratorium: ['ocena pracy podczas ćwiczenia']
    },
    metody_dydaktyczne: {
      wyklad: ['wykład z prezentacją multimedialną', 'wykład z prezentacją oprogramowania'],
      cwiczenia_laboratorium: ['rozwiązywanie zadań', 'metoda projektów (projekt praktyczny)']
    },
    praca_wlasna_studenta: 'Samodzielna praca z narzędziami grafiki komputerowej; ćwiczenia z tworzenia i przetwarzania grafiki; przygotowanie do testu wyboru z zagadnień teorii grafiki.'
  },
  'HIS1.json': {
    kryteria_oceny: {
      wyklad: [],
      cwiczenia_laboratorium: ['kolokwium', 'egzamin ustny', 'ocena sporządzonego dokumentu']
    },
    metody_dydaktyczne: {
      wyklad: [],
      cwiczenia_laboratorium: ['analiza tekstów z dyskusją', 'rozwiązywanie zadań', 'burza mózgów', 'mind map', 'praca grupowa nad projektem z wykorzystaniem nowoczesnych technik informatycznych', 'warsztaty']
    },
    praca_wlasna_studenta: 'Nauka słownictwa i gramatyki języka hiszpańskiego; przygotowywanie prac pisemnych; ćwiczenia konwersacyjne; przygotowanie do kolokwiów i testów.'
  },
  'HIS2.json': {
    kryteria_oceny: {
      wyklad: [],
      cwiczenia_laboratorium: ['kolokwium', 'egzamin ustny', 'ocena sporządzonego dokumentu']
    },
    metody_dydaktyczne: {
      wyklad: [],
      cwiczenia_laboratorium: ['analiza tekstów z dyskusją', 'rozwiązywanie zadań', 'burza mózgów', 'mind map', 'praca grupowa nad projektem z wykorzystaniem nowoczesnych technik informatycznych', 'warsztaty']
    },
    praca_wlasna_studenta: 'Nauka słownictwa i gramatyki języka hiszpańskiego; przygotowywanie prac pisemnych; ćwiczenia konwersacyjne; przygotowanie do kolokwiów i testów.'
  },
  'HIS3.json': {
    kryteria_oceny: {
      wyklad: [],
      cwiczenia_laboratorium: ['kolokwium', 'egzamin ustny', 'ocena sporządzonego dokumentu']
    },
    metody_dydaktyczne: {
      wyklad: [],
      cwiczenia_laboratorium: ['analiza tekstów z dyskusją', 'rozwiązywanie zadań', 'burza mózgów', 'mind map', 'praca grupowa nad projektem z wykorzystaniem nowoczesnych technik informatycznych', 'warsztaty']
    },
    praca_wlasna_studenta: 'Nauka słownictwa i gramatyki języka hiszpańskiego; przygotowywanie prac pisemnych; ćwiczenia konwersacyjne; przygotowanie do kolokwiów i testów.'
  },
  'HIS4.json': {
    kryteria_oceny: {
      wyklad: [],
      cwiczenia_laboratorium: ['kolokwium', 'egzamin ustny', 'ocena sporządzonego dokumentu']
    },
    metody_dydaktyczne: {
      wyklad: [],
      cwiczenia_laboratorium: ['analiza tekstów z dyskusją', 'rozwiązywanie zadań', 'burza mózgów', 'mind map', 'praca grupowa nad projektem z wykorzystaniem nowoczesnych technik informatycznych', 'warsztaty']
    },
    praca_wlasna_studenta: 'Nauka słownictwa i gramatyki języka hiszpańskiego; przygotowywanie prac pisemnych; ćwiczenia konwersacyjne; przygotowanie do kolokwiów i testów.'
  },
  'HKJ.json': {
    kryteria_oceny: {
      wyklad: ['kolokwium końcowe'],
      cwiczenia_laboratorium: []
    },
    metody_dydaktyczne: {
      wyklad: ['wykład z prezentacją multimedialną', 'wykład konwersatoryjny (z elementami dyskusji)'],
      cwiczenia_laboratorium: []
    },
    praca_wlasna_studenta: 'Nauka zagadnień z historii i kultury Japonii; przygotowanie do kolokwium końcowego; samodzielne studia literatury i materiałów dotyczących kultury japońskiej.'
  },
  'ICK.json': {
    kryteria_oceny: {
      wyklad: ['kolokwium'],
      cwiczenia_laboratorium: ['prezentacja projektu i dokumentacji', 'ocena sporządzonego dokumentu', 'ocena pracy podczas ćwiczenia']
    },
    metody_dydaktyczne: {
      wyklad: ['wykład z prezentacją multimedialną', 'wykład konwersatoryjny (z elementami dyskusji)'],
      cwiczenia_laboratorium: ['metoda projektów (projekt praktyczny)', 'praca w grupach', 'warsztaty', 'studia przypadków z bazy studiów przypadków opracowanych przez firmy MŚP lub będące efektem staży']
    },
    praca_wlasna_studenta: 'Projektowanie interfejsów użytkownika z zastosowaniem metod HCI; tworzenie prototypów i makiet; przeprowadzanie testów użyteczności; przygotowanie dokumentacji projektowej.'
  },
  'IML.json': {
    kryteria_oceny: {
      wyklad: [],
      cwiczenia_laboratorium: ['ocena sporządzonego oprogramowania', 'ocena pracy podczas ćwiczenia']
    },
    metody_dydaktyczne: {
      wyklad: ['wykład z prezentacją multimedialną', 'wykład z prezentacją oprogramowania'],
      cwiczenia_laboratorium: ['rozwiązywanie zadań', 'studia przypadków z bazy studiów przypadków opracowanych przez firmy MŚP lub będące efektem staży', 'warsztaty']
    },
    praca_wlasna_studenta: 'Samodzielne zadania programistyczne z machine learning; implementacja i testowanie modeli predykcyjnych; analiza wyników i dostrajanie hiperparametrów.'
  },
  'JAP1.json': {
    kryteria_oceny: {
      wyklad: [],
      cwiczenia_laboratorium: ['kolokwium', 'egzamin ustny', 'ocena sporządzonego dokumentu']
    },
    metody_dydaktyczne: {
      wyklad: [],
      cwiczenia_laboratorium: ['analiza tekstów z dyskusją', 'rozwiązywanie zadań', 'burza mózgów', 'mind map', 'praca grupowa nad projektem z wykorzystaniem nowoczesnych technik informatycznych', 'warsztaty']
    },
    praca_wlasna_studenta: 'Nauka pisma japońskiego (hiragana, katakana, kanji); ćwiczenia gramatyczne i słownikowe; przygotowanie do kolokwiów i testów; ćwiczenie konwersacji.'
  },
  'JAP2.json': {
    kryteria_oceny: {
      wyklad: [],
      cwiczenia_laboratorium: ['kolokwium', 'egzamin ustny', 'ocena sporządzonego dokumentu']
    },
    metody_dydaktyczne: {
      wyklad: [],
      cwiczenia_laboratorium: ['analiza tekstów z dyskusją', 'rozwiązywanie zadań', 'burza mózgów', 'mind map', 'praca grupowa nad projektem z wykorzystaniem nowoczesnych technik informatycznych', 'warsztaty']
    },
    praca_wlasna_studenta: 'Nauka pisma japońskiego (hiragana, katakana, kanji); ćwiczenia gramatyczne i słownikowe; przygotowanie do kolokwiów i testów; ćwiczenie konwersacji.'
  },
  'JAP3.json': {
    kryteria_oceny: {
      wyklad: [],
      cwiczenia_laboratorium: ['kolokwium', 'egzamin ustny', 'ocena sporządzonego dokumentu']
    },
    metody_dydaktyczne: {
      wyklad: [],
      cwiczenia_laboratorium: ['analiza tekstów z dyskusją', 'rozwiązywanie zadań', 'burza mózgów', 'mind map', 'praca grupowa nad projektem z wykorzystaniem nowoczesnych technik informatycznych', 'warsztaty']
    },
    praca_wlasna_studenta: 'Nauka pisma japońskiego; ćwiczenia gramatyczne i słownikowe na poziomie zaawansowanym; przygotowanie do kolokwiów i testów; ćwiczenie konwersacji.'
  },
  'JAP4.json': {
    kryteria_oceny: {
      wyklad: [],
      cwiczenia_laboratorium: ['kolokwium', 'egzamin ustny', 'ocena sporządzonego dokumentu']
    },
    metody_dydaktyczne: {
      wyklad: [],
      cwiczenia_laboratorium: ['analiza tekstów z dyskusją', 'rozwiązywanie zadań', 'burza mózgów', 'mind map', 'praca grupowa nad projektem z wykorzystaniem nowoczesnych technik informatycznych', 'warsztaty']
    },
    praca_wlasna_studenta: 'Nauka pisma japońskiego; ćwiczenia gramatyczne i słownikowe na poziomie zaawansowanym; przygotowanie do kolokwiów i testów; ćwiczenie konwersacji.'
  },
  'JFS.json': {
    kryteria_oceny: {
      wyklad: [],
      cwiczenia_laboratorium: ['prezentacja projektu i dokumentacji', 'ocena sporządzonego oprogramowania']
    },
    metody_dydaktyczne: {
      wyklad: ['wykład z prezentacją multimedialną', 'wykład z prezentacją oprogramowania'],
      cwiczenia_laboratorium: ['metoda projektów (projekt praktyczny)', 'rozwiązywanie zadań']
    },
    praca_wlasna_studenta: 'Projektowanie i implementacja aplikacji w języku F# z wykorzystaniem paradygmatu funkcyjnego; dokumentowanie kodu i architektura projektu; przygotowanie projektu zaliczeniowego.'
  },
  'JJA.json': {
    kryteria_oceny: {
      wyklad: [],
      cwiczenia_laboratorium: ['prezentacja projektu i dokumentacji', 'ocena sporządzonego oprogramowania']
    },
    metody_dydaktyczne: {
      wyklad: ['wykład z prezentacją multimedialną', 'wykład z prezentacją oprogramowania'],
      cwiczenia_laboratorium: ['metoda projektów (projekt praktyczny)', 'rozwiązywanie zadań']
    },
    praca_wlasna_studenta: 'Implementacja aplikacji w języku Java; obsługa wyjątków, kolekcji i operacji I/O; dokumentacja kodu; przygotowanie i prezentacja projektu zaliczeniowego.'
  },
  'JPC.json': {
    kryteria_oceny: {
      wyklad: [],
      cwiczenia_laboratorium: ['prezentacja projektu i dokumentacji', 'ocena sporządzonego oprogramowania']
    },
    metody_dydaktyczne: {
      wyklad: ['wykład z prezentacją multimedialną', 'wykład z prezentacją oprogramowania'],
      cwiczenia_laboratorium: ['metoda projektów (projekt praktyczny)', 'rozwiązywanie zadań']
    },
    praca_wlasna_studenta: 'Implementacja aplikacji w C++; zarządzanie pamięcią, wskaźniki, szablony; dokumentacja kodu; przygotowanie projektu zaliczeniowego.'
  },
  'JPT.json': {
    kryteria_oceny: {
      wyklad: [],
      cwiczenia_laboratorium: ['prezentacja projektu i dokumentacji', 'ocena sporządzonego oprogramowania']
    },
    metody_dydaktyczne: {
      wyklad: ['wykład z prezentacją multimedialną', 'wykład z prezentacją oprogramowania'],
      cwiczenia_laboratorium: ['metoda projektów (projekt praktyczny)', 'rozwiązywanie zadań']
    },
    praca_wlasna_studenta: 'Implementacja aplikacji w języku Python; korzystanie z bibliotek standardowych i zewnętrznych; dokumentacja kodu; przygotowanie i prezentacja projektu zaliczeniowego.'
  },
  'JSC.json': {
    kryteria_oceny: {
      wyklad: [],
      cwiczenia_laboratorium: ['prezentacja projektu i dokumentacji', 'ocena sporządzonego oprogramowania']
    },
    metody_dydaktyczne: {
      wyklad: ['wykład z prezentacją multimedialną', 'wykład z prezentacją oprogramowania'],
      cwiczenia_laboratorium: ['metoda projektów (projekt praktyczny)', 'rozwiązywanie zadań']
    },
    praca_wlasna_studenta: 'Implementacja aplikacji w języku Scala z wykorzystaniem paradygmatów funkcyjnego i obiektowego; dokumentacja kodu; przygotowanie projektu zaliczeniowego.'
  },
  'KCs.json': {
    kryteria_oceny: {
      wyklad: ['kolokwium końcowe'],
      cwiczenia_laboratorium: ['raport z wykonanego zadania', 'kolokwium']
    },
    metody_dydaktyczne: {
      wyklad: ['wykład z prezentacją multimedialną', 'wykład konwersatoryjny (z elementami dyskusji)'],
      cwiczenia_laboratorium: ['rozwiązywanie zadań', 'studia przypadków z bazy studiów przypadków opracowanych przez firmy MŚP lub będące efektem staży', 'warsztaty']
    },
    praca_wlasna_studenta: 'Samodzielne rozwiązywanie zadań CTF (Capture the Flag) z kryminalistyki cyfrowej; analiza dowodów cyfrowych; przygotowanie raportów z przeprowadzonych analiz.'
  },
  'KIP.json': {
    kryteria_oceny: {
      wyklad: ['kolokwium'],
      cwiczenia_laboratorium: ['ocena sporządzonego oprogramowania', 'prezentacja projektu i dokumentacji']
    },
    metody_dydaktyczne: {
      wyklad: ['wykład z prezentacją multimedialną'],
      cwiczenia_laboratorium: ['metoda projektów (projekt praktyczny)', 'rozwiązywanie zadań']
    },
    praca_wlasna_studenta: 'Implementacja i konfiguracja protokołów komunikacyjnych IoT (MQTT, CoAP); realizacja projektu z urządzeniami IoT; przygotowanie do kolokwium teoretyczno-praktycznego.'
  },
  'KLI.json': {
    kryteria_oceny: {
      wyklad: ['ocena pracy podczas ćwiczenia'],
      cwiczenia_laboratorium: []
    },
    metody_dydaktyczne: {
      wyklad: ['wykład konwersatoryjny (z elementami dyskusji)', 'warsztaty'],
      cwiczenia_laboratorium: []
    },
    praca_wlasna_studenta: 'Lektura wskazanych materiałów dotyczących kompetencji liderskich; refleksja i analiza własnych doświadczeń; przygotowanie do aktywnego udziału w konwersatorium.'
  },
  'KMR.json': {
    kryteria_oceny: {
      wyklad: [],
      cwiczenia_laboratorium: ['prezentacja elementu zespołowej pracy semestralnej']
    },
    metody_dydaktyczne: {
      wyklad: [],
      cwiczenia_laboratorium: ['praca w grupach', 'burza mózgów', 'dyskusja']
    },
    praca_wlasna_studenta: 'Praca w grupie nad planem komercjalizacji projektu informatycznego; przygotowanie prezentacji multimedialnej; analiza rynku i strategii wejścia na rynek.'
  },
  'KNO.json': {
    kryteria_oceny: {
      wyklad: [],
      cwiczenia_laboratorium: ['ocena pracy podczas ćwiczenia', 'ocena sporządzonego oprogramowania', 'raport z wykonanego zadania']
    },
    metody_dydaktyczne: {
      wyklad: ['wykład z prezentacją multimedialną', 'wykład z prezentacją oprogramowania'],
      cwiczenia_laboratorium: ['rozwiązywanie zadań', 'metoda projektów (projekt praktyczny)']
    },
    praca_wlasna_studenta: 'Implementacja systemów reprezentacji wiedzy (ontologie, reguły logiczne); rozwiązywanie zadań programistycznych z zakresu KR; przygotowanie raportów z wykonanych zadań.'
  },
  'KPIR.json': {
    kryteria_oceny: {
      wyklad: ['egzamin pisemny z zadaniami problemowymi'],
      cwiczenia_laboratorium: ['ocena pracy podczas ćwiczenia', 'raport z wykonanego zadania']
    },
    metody_dydaktyczne: {
      wyklad: ['wykład z prezentacją multimedialną', 'wykład konwersatoryjny (z elementami dyskusji)'],
      cwiczenia_laboratorium: ['rozwiązywanie zadań', 'metoda projektów (projekt praktyczny)', 'studia przypadków z bazy studiów przypadków opracowanych przez firmy MŚP lub będące efektem staży']
    },
    praca_wlasna_studenta: 'Konfiguracja protokołów IoT (MQTT, CoAP, HTTP) w środowisku symulacyjnym; realizacja mikroprojektów; przygotowanie do egzaminu pisemnego.'
  },
  'KSI.json': {
    kryteria_oceny: {
      wyklad: ['egzamin pisemny z zadaniami problemowymi'],
      cwiczenia_laboratorium: ['raport z wykonanego zadania', 'prezentacja projektu i dokumentacji', 'obrona projektu']
    },
    metody_dydaktyczne: {
      wyklad: ['wykład z prezentacją multimedialną', 'wykład z prezentacją oprogramowania'],
      cwiczenia_laboratorium: ['metoda projektów (projekt praktyczny)', 'rozwiązywanie zadań']
    },
    praca_wlasna_studenta: 'Konteneryzacja aplikacji webowych z użyciem Docker i Docker Compose; konfiguracja klastra Kubernetes; przygotowanie sprawozdań i projektu końcowego.'
  },
  'LANG1.json': {
    kryteria_oceny: {
      wyklad: [],
      cwiczenia_laboratorium: ['kolokwium', 'egzamin ustny', 'ocena sporządzonego dokumentu']
    },
    metody_dydaktyczne: {
      wyklad: [],
      cwiczenia_laboratorium: ['analiza tekstów z dyskusją', 'rozwiązywanie zadań', 'burza mózgów', 'praca grupowa nad projektem z wykorzystaniem nowoczesnych technik informatycznych', 'warsztaty']
    },
    praca_wlasna_studenta: 'Nauka słownictwa i gramatyki języka angielskiego; przygotowywanie prac pisemnych; ćwiczenia konwersacyjne; przygotowanie do kolokwiów i testów.'
  },
  'LANG2.json': {
    kryteria_oceny: {
      wyklad: [],
      cwiczenia_laboratorium: ['kolokwium', 'egzamin ustny', 'ocena sporządzonego dokumentu']
    },
    metody_dydaktyczne: {
      wyklad: [],
      cwiczenia_laboratorium: ['analiza tekstów z dyskusją', 'rozwiązywanie zadań', 'burza mózgów', 'praca grupowa nad projektem z wykorzystaniem nowoczesnych technik informatycznych', 'warsztaty']
    },
    praca_wlasna_studenta: 'Nauka słownictwa i gramatyki języka angielskiego; przygotowywanie prac pisemnych; ćwiczenia konwersacyjne; przygotowanie do kolokwiów i testów.'
  },
  'LANG3.json': {
    kryteria_oceny: {
      wyklad: [],
      cwiczenia_laboratorium: ['kolokwium', 'egzamin ustny', 'ocena sporządzonego dokumentu']
    },
    metody_dydaktyczne: {
      wyklad: [],
      cwiczenia_laboratorium: ['analiza tekstów z dyskusją', 'rozwiązywanie zadań', 'burza mózgów', 'praca grupowa nad projektem z wykorzystaniem nowoczesnych technik informatycznych', 'warsztaty']
    },
    praca_wlasna_studenta: 'Nauka słownictwa i gramatyki języka angielskiego; przygotowywanie prac pisemnych; ćwiczenia konwersacyjne; przygotowanie do kolokwiów i testów.'
  },
  'LANG4.json': {
    kryteria_oceny: {
      wyklad: [],
      cwiczenia_laboratorium: ['kolokwium', 'egzamin ustny', 'ocena sporządzonego dokumentu']
    },
    metody_dydaktyczne: {
      wyklad: [],
      cwiczenia_laboratorium: ['analiza tekstów z dyskusją', 'rozwiązywanie zadań', 'burza mózgów', 'praca grupowa nad projektem z wykorzystaniem nowoczesnych technik informatycznych', 'warsztaty']
    },
    praca_wlasna_studenta: 'Nauka słownictwa i gramatyki języka angielskiego; przygotowywanie prac pisemnych; ćwiczenia konwersacyjne; przygotowanie do kolokwiów i testów.'
  },
  'LLP.json': {
    kryteria_oceny: {
      wyklad: [],
      cwiczenia_laboratorium: ['kolokwium', 'ocena pracy podczas ćwiczenia']
    },
    metody_dydaktyczne: {
      wyklad: ['wykład z prezentacją multimedialną', 'wykład z prezentacją oprogramowania'],
      cwiczenia_laboratorium: ['rozwiązywanie zadań', 'warsztaty']
    },
    praca_wlasna_studenta: 'Samodzielna implementacja programów systemowych; ćwiczenia z systemowych wywołań API; przygotowanie do kolokwiów; praca z narzędziami debugowania na poziomie systemu.'
  },
  'M3D.json': {
    kryteria_oceny: {
      wyklad: [],
      cwiczenia_laboratorium: ['ocena sporządzonego oprogramowania', 'prezentacja samodzielnej pracy semestralnej']
    },
    metody_dydaktyczne: {
      wyklad: ['wykład z prezentacją multimedialną', 'wykład konwersatoryjny (z elementami dyskusji)'],
      cwiczenia_laboratorium: ['metoda projektów (projekt praktyczny)', 'warsztaty', 'studia przypadków z bazy studiów przypadków opracowanych przez firmy MŚP lub będące efektem staży']
    },
    praca_wlasna_studenta: 'Samodzielna praca nad modelami 3D dla gier; budowanie portfolio ćwiczeń semestralnych; realizacja projektu końcowego z modelowania 3D; eksploracja narzędzi (Blender, Maya).'
  },
  'MAD.json': {
    kryteria_oceny: {
      wyklad: ['egzamin pisemny'],
      cwiczenia_laboratorium: ['kolokwium']
    },
    metody_dydaktyczne: {
      wyklad: ['wykład z prezentacją multimedialną'],
      cwiczenia_laboratorium: ['rozwiązywanie zadań', 'dyskusja']
    },
    praca_wlasna_studenta: 'Samodzielne rozwiązywanie zadań z matematyki dyskretnej; ćwiczenia z kombinatoryki, teorii grafów i logiki; przygotowanie do kolokwiów i egzaminu.'
  },
  'MAS.json': {
    kryteria_oceny: {
      wyklad: ['egzamin pisemny z zadaniami problemowymi'],
      cwiczenia_laboratorium: ['kolokwium', 'ocena sporządzonego oprogramowania']
    },
    metody_dydaktyczne: {
      wyklad: ['wykład z prezentacją multimedialną', 'wykład konwersatoryjny (z elementami dyskusji)'],
      cwiczenia_laboratorium: ['rozwiązywanie zadań', 'metoda projektów (projekt praktyczny)']
    },
    praca_wlasna_studenta: 'Implementacja projektów programistycznych dotyczących analizy leksykalnej i automatów; przygotowanie do kolokwium i egzaminu; tworzenie dokumentacji modeli.'
  },
  'MFL.json': {
    kryteria_oceny: {
      wyklad: [],
      cwiczenia_laboratorium: ['prezentacja projektu i dokumentacji', 'ocena sporządzonego oprogramowania']
    },
    metody_dydaktyczne: {
      wyklad: ['wykład z prezentacją multimedialną', 'wykład z prezentacją oprogramowania'],
      cwiczenia_laboratorium: ['metoda projektów (projekt praktyczny)', 'rozwiązywanie zadań']
    },
    praca_wlasna_studenta: 'Projektowanie i implementacja aplikacji mobilnej we Flutterze; integracja z API; zarządzanie stanem; przygotowanie dokumentacji i prezentacji projektu.'
  },
  'MHE.json': {
    kryteria_oceny: {
      wyklad: [],
      cwiczenia_laboratorium: ['ocena sporządzonego oprogramowania', 'ocena pracy podczas ćwiczenia']
    },
    metody_dydaktyczne: {
      wyklad: ['wykład z prezentacją multimedialną', 'wykład z prezentacją oprogramowania'],
      cwiczenia_laboratorium: ['metoda projektów (projekt praktyczny)', 'warsztaty']
    },
    praca_wlasna_studenta: 'Implementacja zadań z metaheurystyk w C++ (algorytmy ewolucyjne, symulowane wyżarzanie itp.); prowadzenie repozytorium git; obrona kolejnych zadań zaliczeniowych.'
  },
  'MLR.json': {
    kryteria_oceny: {
      wyklad: [],
      cwiczenia_laboratorium: ['ocena sporządzonego oprogramowania', 'ocena pracy podczas ćwiczenia']
    },
    metody_dydaktyczne: {
      wyklad: ['wykład z prezentacją multimedialną', 'wykład z prezentacją oprogramowania'],
      cwiczenia_laboratorium: ['rozwiązywanie zadań', 'studia przypadków z bazy studiów przypadków opracowanych przez firmy MŚP lub będące efektem staży', 'warsztaty']
    },
    praca_wlasna_studenta: 'Samodzielne zadania programistyczne z machine learning; praca nad indywidualnym zadaniem zaliczeniowym; analiza i interpretacja wyników modeli predykcyjnych.'
  },
  'MNE.json': {
    kryteria_oceny: {
      wyklad: [],
      cwiczenia_laboratorium: ['prezentacja projektu i dokumentacji', 'ocena sporządzonego oprogramowania']
    },
    metody_dydaktyczne: {
      wyklad: ['wykład z prezentacją multimedialną', 'wykład z prezentacją oprogramowania'],
      cwiczenia_laboratorium: ['metoda projektów (projekt praktyczny)', 'rozwiązywanie zadań']
    },
    praca_wlasna_studenta: 'Projektowanie i implementacja aplikacji mobilnej w .NET MAUI z wzorcem MVVM; integracja z API; nawigacja; przygotowanie dokumentacji projektu.'
  },
  'MRN.json': {
    kryteria_oceny: {
      wyklad: [],
      cwiczenia_laboratorium: ['prezentacja projektu i dokumentacji', 'ocena sporządzonego oprogramowania']
    },
    metody_dydaktyczne: {
      wyklad: ['wykład z prezentacją multimedialną', 'wykład z prezentacją oprogramowania'],
      cwiczenia_laboratorium: ['metoda projektów (projekt praktyczny)', 'rozwiązywanie zadań']
    },
    praca_wlasna_studenta: 'Projektowanie i implementacja aplikacji mobilnej w React Native; obsługa stanu i nawigacji; integracja z API; przygotowanie dokumentacji projektu.'
  },
  'MUN.json': {
    kryteria_oceny: {
      wyklad: [],
      cwiczenia_laboratorium: ['prezentacja projektu i dokumentacji', 'ocena sporządzonego oprogramowania']
    },
    metody_dydaktyczne: {
      wyklad: ['wykład z prezentacją multimedialną', 'wykład z prezentacją oprogramowania'],
      cwiczenia_laboratorium: ['metoda projektów (projekt praktyczny)', 'warsztaty']
    },
    praca_wlasna_studenta: 'Projektowanie i implementacja gry lub aplikacji interaktywnej w Unity 3D; praca ze skryptami C#; zarządzanie scenami i obiektami; przygotowanie dokumentacji projektu.'
  },
  'NAI.json': {
    kryteria_oceny: {
      wyklad: [],
      cwiczenia_laboratorium: ['prezentacja mini-projektu', 'ocena sporządzonego oprogramowania']
    },
    metody_dydaktyczne: {
      wyklad: ['wykład z prezentacją multimedialną', 'wykład z prezentacją oprogramowania'],
      cwiczenia_laboratorium: ['rozwiązywanie zadań', 'metoda projektów (projekt praktyczny)']
    },
    praca_wlasna_studenta: 'Implementacja niewielkich projektów praktycznych z narzędzi AI; eksploracja bibliotek i frameworków AI; przygotowanie prezentacji projektu.'
  },
  'NIM1.json': {
    kryteria_oceny: {
      wyklad: [],
      cwiczenia_laboratorium: ['kolokwium', 'egzamin ustny', 'ocena sporządzonego dokumentu']
    },
    metody_dydaktyczne: {
      wyklad: [],
      cwiczenia_laboratorium: ['analiza tekstów z dyskusją', 'rozwiązywanie zadań', 'burza mózgów', 'mind map', 'praca grupowa nad projektem z wykorzystaniem nowoczesnych technik informatycznych', 'warsztaty']
    },
    praca_wlasna_studenta: 'Nauka słownictwa i gramatyki języka niemieckiego; przygotowywanie prac pisemnych; ćwiczenia konwersacyjne; przygotowanie do kolokwiów i testów.'
  },
  'NIM2.json': {
    kryteria_oceny: {
      wyklad: [],
      cwiczenia_laboratorium: ['kolokwium', 'egzamin ustny', 'ocena sporządzonego dokumentu']
    },
    metody_dydaktyczne: {
      wyklad: [],
      cwiczenia_laboratorium: ['analiza tekstów z dyskusją', 'rozwiązywanie zadań', 'burza mózgów', 'mind map', 'praca grupowa nad projektem z wykorzystaniem nowoczesnych technik informatycznych', 'warsztaty']
    },
    praca_wlasna_studenta: 'Nauka słownictwa i gramatyki języka niemieckiego; przygotowywanie prac pisemnych; ćwiczenia konwersacyjne; przygotowanie do kolokwiów i testów.'
  },
  'NIM3.json': {
    kryteria_oceny: {
      wyklad: [],
      cwiczenia_laboratorium: ['kolokwium', 'egzamin ustny', 'ocena sporządzonego dokumentu']
    },
    metody_dydaktyczne: {
      wyklad: [],
      cwiczenia_laboratorium: ['analiza tekstów z dyskusją', 'rozwiązywanie zadań', 'burza mózgów', 'mind map', 'praca grupowa nad projektem z wykorzystaniem nowoczesnych technik informatycznych', 'warsztaty']
    },
    praca_wlasna_studenta: 'Nauka słownictwa i gramatyki języka niemieckiego; przygotowywanie prac pisemnych; ćwiczenia konwersacyjne; przygotowanie do kolokwiów i testów.'
  },
  'NIM4.json': {
    kryteria_oceny: {
      wyklad: [],
      cwiczenia_laboratorium: ['kolokwium', 'egzamin ustny', 'ocena sporządzonego dokumentu']
    },
    metody_dydaktyczne: {
      wyklad: [],
      cwiczenia_laboratorium: ['analiza tekstów z dyskusją', 'rozwiązywanie zadań', 'burza mózgów', 'mind map', 'praca grupowa nad projektem z wykorzystaniem nowoczesnych technik informatycznych', 'warsztaty']
    },
    praca_wlasna_studenta: 'Nauka słownictwa i gramatyki języka niemieckiego; przygotowywanie prac pisemnych; ćwiczenia konwersacyjne; przygotowanie do kolokwiów i testów.'
  },
  'OGL.json': {
    kryteria_oceny: {
      wyklad: ['egzamin pisemny - test wyboru'],
      cwiczenia_laboratorium: ['ocena pracy podczas ćwiczenia']
    },
    metody_dydaktyczne: {
      wyklad: ['wykład z prezentacją multimedialną', 'wykład z prezentacją oprogramowania'],
      cwiczenia_laboratorium: ['rozwiązywanie zadań', 'metoda projektów (projekt praktyczny)']
    },
    praca_wlasna_studenta: 'Implementacja scen 3D w OpenGL; ćwiczenia z shaderów, oświetlenia i teksturowania; przygotowanie zadań laboratoryjnych; samodzielne eksperymenty z grafiką 3D.'
  },
  'PAI.json': {
    kryteria_oceny: {
      wyklad: ['kolokwium'],
      cwiczenia_laboratorium: ['ocena pracy podczas ćwiczenia', 'ocena sporządzonego oprogramowania', 'prezentacja projektu i dokumentacji']
    },
    metody_dydaktyczne: {
      wyklad: ['wykład konwersatoryjny (z elementami dyskusji)', 'wykład z prezentacją oprogramowania'],
      cwiczenia_laboratorium: ['metoda projektów (projekt praktyczny)', 'praca w grupach', 'warsztaty']
    },
    praca_wlasna_studenta: 'Implementacja projektu semestralnego z DDD i architekturą oktogonalną; pisanie testów integracyjnych i E2E; konfiguracja konteneryzacji; przygotowanie do kolokwium z architektury.'
  },
  'PBA.json': {
    kryteria_oceny: {
      wyklad: ['kolokwium końcowe'],
      cwiczenia_laboratorium: ['kolokwium końcowe', 'raport z wykonanego zadania']
    },
    metody_dydaktyczne: {
      wyklad: ['wykład z prezentacją multimedialną', 'wykład konwersatoryjny (z elementami dyskusji)'],
      cwiczenia_laboratorium: ['studia przypadków z bazy studiów przypadków opracowanych przez firmy MŚP lub będące efektem staży', 'rozwiązywanie zadań']
    },
    praca_wlasna_studenta: 'Analiza przypadków projektowania bezpiecznych architektur; samodzielne ćwiczenia modelowania zagrożeń (threat modeling); przygotowanie do kolokwium pisemnego.'
  },
  'PG1.json': {
    kryteria_oceny: {
      wyklad: [],
      cwiczenia_laboratorium: ['prezentacja projektu i dokumentacji', 'ocena pracy podczas ćwiczenia']
    },
    metody_dydaktyczne: {
      wyklad: ['wykład z prezentacją multimedialną'],
      cwiczenia_laboratorium: ['metoda projektów (projekt praktyczny)', 'praca w grupach']
    },
    praca_wlasna_studenta: 'Samodzielna praca nad prototypem gry komputerowej; testowanie mechanik i rozgrywki; przygotowanie dokumentacji projektowej i prezentacji.'
  },
  'PG2.json': {
    kryteria_oceny: {
      wyklad: [],
      cwiczenia_laboratorium: ['prezentacja projektu i dokumentacji', 'ocena pracy podczas ćwiczenia']
    },
    metody_dydaktyczne: {
      wyklad: ['wykład z prezentacją multimedialną'],
      cwiczenia_laboratorium: ['metoda projektów (projekt praktyczny)', 'praca w grupach']
    },
    praca_wlasna_studenta: 'Rozwijanie projektu gry komputerowej; iteracyjne doskonalenie rozgrywki i mechanik; przygotowanie dokumentacji projektowej i prezentacji końcowej.'
  },
  'PJN.json': {
    kryteria_oceny: {
      wyklad: [],
      cwiczenia_laboratorium: ['ocena sporządzonego oprogramowania', 'prezentacja projektu i dokumentacji']
    },
    metody_dydaktyczne: {
      wyklad: ['wykład z prezentacją multimedialną', 'wykład z prezentacją oprogramowania'],
      cwiczenia_laboratorium: ['rozwiązywanie zadań', 'metoda projektów (projekt praktyczny)', 'praca w grupach']
    },
    praca_wlasna_studenta: 'Rozwiązywanie zadań NLP w Google Colab; praca nad projektem zespołowym z przetwarzania języka naturalnego; przygotowanie prezentacji posterowej.'
  },
  'POJ.json': {
    kryteria_oceny: {
      wyklad: [],
      cwiczenia_laboratorium: ['ocena pracy podczas ćwiczenia', 'ocena sporządzonego oprogramowania']
    },
    metody_dydaktyczne: {
      wyklad: ['wykład z prezentacją multimedialną', 'wykład z prezentacją oprogramowania'],
      cwiczenia_laboratorium: ['rozwiązywanie zadań', 'warsztaty']
    },
    praca_wlasna_studenta: 'Samodzielne programowanie w C# z zastosowaniem paradygmatu obiektowego; wykonywanie zadań domowych; przygotowanie do kolejnych zajęć laboratoryjnych.'
  },
  'POZ.json': {
    kryteria_oceny: {
      wyklad: ['kolokwium'],
      cwiczenia_laboratorium: ['ocena pracy podczas ćwiczenia', 'prezentacja elementu zespołowej pracy semestralnej']
    },
    metody_dydaktyczne: {
      wyklad: ['wykład z prezentacją multimedialną', 'wykład konwersatoryjny (z elementami dyskusji)'],
      cwiczenia_laboratorium: ['praca w grupach', 'studia przypadków z bazy studiów przypadków opracowanych przez firmy MŚP lub będące efektem staży', 'dyskusja']
    },
    praca_wlasna_studenta: 'Praca nad planem biznesowym własnego przedsięwzięcia; analiza przypadków biznesowych; przygotowanie prezentacji multimedialnej; przygotowanie do kolokwium z treści wykładów.'
  },
  'PPS.json': {
    kryteria_oceny: {
      wyklad: [],
      cwiczenia_laboratorium: ['ocena sporządzonego oprogramowania', 'prezentacja projektu i dokumentacji']
    },
    metody_dydaktyczne: {
      wyklad: ['wykład z prezentacją multimedialną', 'wykład z prezentacją oprogramowania'],
      cwiczenia_laboratorium: ['metoda projektów (projekt praktyczny)', 'rozwiązywanie zadań', 'warsztaty']
    },
    praca_wlasna_studenta: 'Implementacja projektu z programowania platform sprzętowych (mikrokontrolery, FPGA); testowanie działania oprogramowania; przygotowanie dokumentacji i prezentacji.'
  },
  'PRG1.json': {
    kryteria_oceny: {
      wyklad: [],
      cwiczenia_laboratorium: ['kolokwium', 'ocena pracy podczas ćwiczenia', 'ocena sporządzonego oprogramowania']
    },
    metody_dydaktyczne: {
      wyklad: ['wykład z prezentacją multimedialną', 'wykład z prezentacją oprogramowania'],
      cwiczenia_laboratorium: ['rozwiązywanie zadań', 'metoda projektów (projekt praktyczny)']
    },
    praca_wlasna_studenta: 'Samodzielne rozwiązywanie zadań programistycznych; implementacja projektu programistycznego; przygotowanie do kolokwiów; ćwiczenia algorytmiczne.'
  },
  'PRI.json': {
    kryteria_oceny: {
      wyklad: [],
      cwiczenia_laboratorium: ['prezentacja projektu i dokumentacji', 'kolokwium końcowe', 'ocena pracy podczas ćwiczenia']
    },
    metody_dydaktyczne: {
      wyklad: ['wykład z prezentacją multimedialną', 'wykład konwersatoryjny (z elementami dyskusji)'],
      cwiczenia_laboratorium: ['metoda projektów (projekt praktyczny)', 'praca w grupach', 'studia przypadków z bazy studiów przypadków opracowanych przez firmy MŚP lub będące efektem staży']
    },
    praca_wlasna_studenta: 'Projektowanie systemu informacyjnego z użyciem narzędzi CASE; tworzenie diagramów UML i dokumentacji; przygotowanie do kolokwium końcowego; prezentacja projektu.'
  },
  'PRIN.json': {
    kryteria_oceny: {
      wyklad: [],
      cwiczenia_laboratorium: ['raport z wykonanego zadania', 'ocena pracy podczas ćwiczenia']
    },
    metody_dydaktyczne: {
      wyklad: [],
      cwiczenia_laboratorium: ['analiza tekstów z dyskusją', 'rozwiązywanie zadań', 'burza mózgów', 'praca grupowa nad projektem z wykorzystaniem nowoczesnych technik informatycznych', 'warsztaty']
    },
    praca_wlasna_studenta: 'Praca nad opracowaniami koncepcyjnymi z zakresu innowacji; analiza przypadków procesów innowacyjnych; przygotowanie sprawozdań; ćwiczenia obliczeniowe.'
  },
  'PRO.json': {
    kryteria_oceny: {
      wyklad: [],
      cwiczenia_laboratorium: ['prezentacja projektu i dokumentacji', 'obrona projektu', 'raport z wykonanego zadania', 'ocena sporządzonego dokumentu', 'ocena sporządzonego oprogramowania']
    },
    metody_dydaktyczne: {
      wyklad: [],
      cwiczenia_laboratorium: ['metoda projektów (projekt praktyczny)', 'praca grupowa nad projektem z wykorzystaniem nowoczesnych technik informatycznych', 'burza mózgów']
    },
    praca_wlasna_studenta: 'Realizacja kolejnych komponentów projektu dyplomowego; dokumentowanie produktów projektowych; przygotowanie do obrony projektu; weryfikacja i testowanie oprogramowania.'
  },
  'PRZ1.json': {
    kryteria_oceny: {
      wyklad: [],
      cwiczenia_laboratorium: ['ocena pracy podczas ćwiczenia', 'prezentacja elementu zespołowej pracy semestralnej', 'raport z wykonanego zadania']
    },
    metody_dydaktyczne: {
      wyklad: [],
      cwiczenia_laboratorium: ['metoda projektów (projekt praktyczny)', 'praca grupowa nad projektem z wykorzystaniem nowoczesnych technik informatycznych', 'burza mózgów']
    },
    praca_wlasna_studenta: 'Realizacja przydzielonych zadań w projekcie zespołowym; dokumentowanie postępów; przygotowanie wydania (release) produktu; współpraca z zespołem projektowym.'
  },
  'PRZ2.json': {
    kryteria_oceny: {
      wyklad: [],
      cwiczenia_laboratorium: ['prezentacja projektu i dokumentacji', 'obrona projektu', 'ocena sporządzonego dokumentu', 'ocena sporządzonego oprogramowania']
    },
    metody_dydaktyczne: {
      wyklad: [],
      cwiczenia_laboratorium: ['metoda projektów (projekt praktyczny)', 'praca grupowa nad projektem z wykorzystaniem nowoczesnych technik informatycznych']
    },
    praca_wlasna_studenta: 'Kontynuacja i finalizacja projektu dyplomowego; opracowanie dokumentacji końcowej; przygotowanie prezentacji finalnej i obrony przed komisją.'
  },
  'PSEM.json': {
    kryteria_oceny: {
      wyklad: [],
      cwiczenia_laboratorium: ['prezentacja samodzielnej pracy semestralnej', 'ocena sporządzonego dokumentu']
    },
    metody_dydaktyczne: {
      wyklad: [],
      cwiczenia_laboratorium: ['metoda projektów (projekt praktyczny)', 'praca w grupach', 'dyskusja']
    },
    praca_wlasna_studenta: 'Przygotowanie konspektu pracy dyplomowej; realizacja kolejnych zadań wspomagających pracę dyplomową; przygotowanie dwóch prezentacji seminaryjnych; konsultacje z promotorem.'
  },
  'PTT.json': {
    kryteria_oceny: {
      wyklad: [],
      cwiczenia_laboratorium: ['ocena sporządzonego oprogramowania', 'prezentacja projektu i dokumentacji']
    },
    metody_dydaktyczne: {
      wyklad: ['wykład z prezentacją multimedialną', 'wykład z prezentacją oprogramowania'],
      cwiczenia_laboratorium: ['metoda projektów (projekt praktyczny)', 'warsztaty']
    },
    praca_wlasna_studenta: 'Realizacja projektów prototypowania z użyciem narzędzi (np. Figma, Arduino, platformy IoT); przygotowanie dokumentacji i prezentacji projektu końcowego.'
  },
  'PUI.json': {
    kryteria_oceny: {
      wyklad: ['ocena pracy podczas ćwiczenia'],
      cwiczenia_laboratorium: []
    },
    metody_dydaktyczne: {
      wyklad: ['wykład konwersatoryjny (z elementami dyskusji)', 'warsztaty'],
      cwiczenia_laboratorium: []
    },
    praca_wlasna_studenta: 'Lektura wskazanych materiałów z psychologii i komunikacji interpersonalnej; refleksja nad własnymi kompetencjami inżynierskimi; przygotowanie do aktywnego uczestnictwa w konwersatoriach.'
  },
  'RBD.json': {
    kryteria_oceny: {
      wyklad: [],
      cwiczenia_laboratorium: ['kolokwium', 'ocena pracy podczas ćwiczenia']
    },
    metody_dydaktyczne: {
      wyklad: ['wykład z prezentacją multimedialną', 'wykład z prezentacją oprogramowania'],
      cwiczenia_laboratorium: ['rozwiązywanie zadań', 'warsztaty']
    },
    praca_wlasna_studenta: 'Projektowanie i implementacja zapytań SQL; modelowanie relacyjnych baz danych (normalizacja, diagramy ER); przygotowanie do kolokwium.'
  },
  'RTO.json': {
    kryteria_oceny: {
      wyklad: [],
      cwiczenia_laboratorium: ['ocena pracy podczas ćwiczenia', 'prezentacja projektu i dokumentacji']
    },
    metody_dydaktyczne: {
      wyklad: ['wykład z prezentacją multimedialną', 'wykład konwersatoryjny (z elementami dyskusji)'],
      cwiczenia_laboratorium: ['metoda projektów (projekt praktyczny)', 'praca w grupach', 'rozwiązywanie zadań']
    },
    praca_wlasna_studenta: 'Realizacja projektów zespołowych z systemów czasu rzeczywistego; implementacja i testowanie algorytmów real-time; przygotowanie dokumentacji projektowej.'
  },
  'S3D.json': {
    kryteria_oceny: {
      wyklad: [],
      cwiczenia_laboratorium: ['ocena sporządzonego oprogramowania', 'obrona projektu']
    },
    metody_dydaktyczne: {
      wyklad: ['wykład z prezentacją multimedialną', 'wykład konwersatoryjny (z elementami dyskusji)'],
      cwiczenia_laboratorium: ['metoda projektów (projekt praktyczny)', 'warsztaty']
    },
    praca_wlasna_studenta: 'Samodzielna implementacja projektów symulacyjnych 3D; ćwiczenia z silnikami symulacyjnymi; przygotowanie i obrona pracy zaliczeniowej.'
  },
  'SAD.json': {
    kryteria_oceny: {
      wyklad: ['egzamin pisemny'],
      cwiczenia_laboratorium: ['kolokwium']
    },
    metody_dydaktyczne: {
      wyklad: ['wykład z prezentacją multimedialną'],
      cwiczenia_laboratorium: ['rozwiązywanie zadań', 'warsztaty']
    },
    praca_wlasna_studenta: 'Samodzielna analiza zbiorów danych statystycznych; ćwiczenia z narzędzi statystycznych (R, Python); przygotowanie do kolokwiów laboratoryjnych i egzaminu pisemnego.'
  },
  'SAI.json': {
    kryteria_oceny: {
      wyklad: [],
      cwiczenia_laboratorium: ['ocena pracy podczas ćwiczenia', 'prezentacja elementu zespołowej pracy semestralnej']
    },
    metody_dydaktyczne: {
      wyklad: ['wykład konwersatoryjny (z elementami dyskusji)', 'wykład z prezentacją multimedialną'],
      cwiczenia_laboratorium: ['analiza tekstów z dyskusją', 'burza mózgów', 'dyskusja', 'studia przypadków z bazy studiów przypadków opracowanych przez firmy MŚP lub będące efektem staży']
    },
    praca_wlasna_studenta: 'Analiza wpływu technologii informatycznych na społeczeństwo; przygotowanie prezentacji tematycznej; lektura wskazanych materiałów dotyczących etyki i społecznych aspektów IT.'
  },
  'SCR.json': {
    kryteria_oceny: {
      wyklad: ['sprawdziany wstępne „wejściówki"'],
      cwiczenia_laboratorium: ['sprawdziany wstępne „wejściówki"', 'raport z wykonanego zadania', 'ocena pracy podczas ćwiczenia']
    },
    metody_dydaktyczne: {
      wyklad: ['wykład z prezentacją multimedialną', 'wykład konwersatoryjny (z elementami dyskusji)'],
      cwiczenia_laboratorium: ['rozwiązywanie zadań', 'studia przypadków z bazy studiów przypadków opracowanych przez firmy MŚP lub będące efektem staży', 'warsztaty']
    },
    praca_wlasna_studenta: 'Projektowanie systemów czasu rzeczywistego dla zadanej specyfikacji; badania symulacyjne; przygotowanie sprawozdań z laboratoriów; powtórzenie materiału przed kartkówkami.'
  },
  'SGD.json': {
    kryteria_oceny: {
      wyklad: ['sprawdziany wstępne „wejściówki"'],
      cwiczenia_laboratorium: ['ocena sporządzonego oprogramowania', 'ocena pracy podczas ćwiczenia']
    },
    metody_dydaktyczne: {
      wyklad: ['wykład z prezentacją multimedialną', 'wykład konwersatoryjny (z elementami dyskusji)'],
      cwiczenia_laboratorium: ['rozwiązywanie zadań', 'metoda projektów (projekt praktyczny)', 'burza mózgów']
    },
    praca_wlasna_studenta: 'Implementacja projektu programistycznego z symulacji i gier decyzyjnych; przygotowanie do kartkówek z części teoretycznej; eksperymenty z modelami decyzyjnymi.'
  },
  'SGK.json': {
    kryteria_oceny: {
      wyklad: [],
      cwiczenia_laboratorium: ['prezentacja projektu i dokumentacji', 'ocena sporządzonego oprogramowania']
    },
    metody_dydaktyczne: {
      wyklad: ['wykład z prezentacją multimedialną'],
      cwiczenia_laboratorium: ['metoda projektów (projekt praktyczny)', 'praca w grupach']
    },
    praca_wlasna_studenta: 'Projektowanie i implementacja gry lub aplikacji w wybranym silniku; praca w zespole 2–3 osobowym; optymalizacja zasobów; przygotowanie dokumentacji i prezentacji projektu.'
  },
  'SITA.json': {
    kryteria_oceny: {
      wyklad: ['kolokwium końcowe'],
      cwiczenia_laboratorium: ['kolokwium końcowe', 'raport z wykonanego zadania']
    },
    metody_dydaktyczne: {
      wyklad: ['wykład z prezentacją multimedialną', 'wykład konwersatoryjny (z elementami dyskusji)'],
      cwiczenia_laboratorium: ['studia przypadków z bazy studiów przypadków opracowanych przez firmy MŚP lub będące efektem staży', 'rozwiązywanie zadań']
    },
    praca_wlasna_studenta: 'Analiza przypadków projektowania bezpiecznych architektur IT; modelowanie zagrożeń i ryzyk; przygotowanie do kolokwium pisemnego.'
  },
  'SKOA.json': {
    kryteria_oceny: {
      wyklad: ['egzamin pisemny'],
      cwiczenia_laboratorium: ['kolokwium', 'ocena pracy podczas ćwiczenia']
    },
    metody_dydaktyczne: {
      wyklad: ['wykład z prezentacją multimedialną', 'wykład konwersatoryjny (z elementami dyskusji)'],
      cwiczenia_laboratorium: ['rozwiązywanie zadań', 'warsztaty']
    },
    praca_wlasna_studenta: 'Samodzielna konfiguracja sieci w symulatorze Cisco Packet Tracer; ćwiczenia z adresacji IP; przygotowanie do kolokwium i egzaminu z sieci komputerowych.'
  },
  'SOP.json': {
    kryteria_oceny: {
      wyklad: ['egzamin pisemny'],
      cwiczenia_laboratorium: ['kolokwium', 'ocena sporządzonego oprogramowania']
    },
    metody_dydaktyczne: {
      wyklad: ['wykład z prezentacją multimedialną', 'wykład z prezentacją oprogramowania'],
      cwiczenia_laboratorium: ['rozwiązywanie zadań', 'metoda projektów (projekt praktyczny)', 'warsztaty']
    },
    praca_wlasna_studenta: 'Samodzielne ćwiczenia z systemów operacyjnych (zarządzanie procesami, pamięcią, systemem plików); realizacja projektu zespołowego; przygotowanie do kolokwium i egzaminu.'
  },
  'SPR.json': {
    kryteria_oceny: {
      wyklad: [],
      cwiczenia_laboratorium: ['prezentacja mini-projektu', 'obrona projektu']
    },
    metody_dydaktyczne: {
      wyklad: ['wykład z prezentacją multimedialną', 'wykład z prezentacją oprogramowania'],
      cwiczenia_laboratorium: ['metoda projektów (projekt praktyczny)', 'warsztaty', 'rozwiązywanie zadań']
    },
    praca_wlasna_studenta: 'Samodzielna praca nad projektami prototypowania; implementacja prototypów z użyciem wybranych technologii; przygotowanie prezentacji i obrony projektu.'
  },
  'SWB.json': {
    kryteria_oceny: {
      wyklad: ['kolokwium'],
      cwiczenia_laboratorium: ['ocena pracy podczas ćwiczenia', 'ocena sporządzonego oprogramowania']
    },
    metody_dydaktyczne: {
      wyklad: ['wykład z prezentacją multimedialną', 'wykład z prezentacją oprogramowania'],
      cwiczenia_laboratorium: ['rozwiązywanie zadań', 'studia przypadków z bazy studiów przypadków opracowanych przez firmy MŚP lub będące efektem staży', 'warsztaty']
    },
    praca_wlasna_studenta: 'Samodzielne zadania praktyczne z systemów wbudowanych; realizacja zadania indywidualnego; programowanie mikrokontrolerów i integracja z peryferiami.'
  },
  'TAPI.json': {
    kryteria_oceny: {
      wyklad: ['egzamin pisemny z zadaniami problemowymi'],
      cwiczenia_laboratorium: ['ocena sporządzonego oprogramowania', 'prezentacja projektu i dokumentacji']
    },
    metody_dydaktyczne: {
      wyklad: ['wykład z prezentacją multimedialną', 'wykład konwersatoryjny (z elementami dyskusji)'],
      cwiczenia_laboratorium: ['metoda projektów (projekt praktyczny)', 'rozwiązywanie zadań', 'burza mózgów']
    },
    praca_wlasna_studenta: 'Projektowanie i implementacja projektu programistycznego z nowoczesnych technologii API; przygotowanie prezentacji i dokumentacji projektu; przygotowanie do egzaminu.'
  },
  'TBK.json': {
    kryteria_oceny: {
      wyklad: ['kolokwium końcowe'],
      cwiczenia_laboratorium: ['ocena sporządzonego oprogramowania', 'prezentacja projektu i dokumentacji']
    },
    metody_dydaktyczne: {
      wyklad: ['wykład z prezentacją multimedialną', 'wykład konwersatoryjny (z elementami dyskusji)'],
      cwiczenia_laboratorium: ['metoda projektów (projekt praktyczny)', 'rozwiązywanie zadań', 'burza mózgów']
    },
    praca_wlasna_studenta: 'Samodzielna implementacja projektu backendowego; przygotowanie do kolokwium z zagadnień technologii backendowych; dokumentacja projektu.'
  },
  'TBS.json': {
    kryteria_oceny: {
      wyklad: ['kolokwium końcowe'],
      cwiczenia_laboratorium: ['kolokwium końcowe', 'raport z wykonanego zadania']
    },
    metody_dydaktyczne: {
      wyklad: ['wykład z prezentacją multimedialną', 'wykład konwersatoryjny (z elementami dyskusji)'],
      cwiczenia_laboratorium: ['studia przypadków z bazy studiów przypadków opracowanych przez firmy MŚP lub będące efektem staży', 'rozwiązywanie zadań']
    },
    praca_wlasna_studenta: 'Samodzielne testowanie bezpieczeństwa systemów IT z użyciem wybranych narzędzi; analiza podatności; przygotowanie do kolokwium pisemnego.'
  },
  'TFN.json': {
    kryteria_oceny: {
      wyklad: ['egzamin pisemny'],
      cwiczenia_laboratorium: ['ocena sporządzonego oprogramowania', 'prezentacja projektu i dokumentacji']
    },
    metody_dydaktyczne: {
      wyklad: ['wykład z prezentacją multimedialną', 'wykład konwersatoryjny (z elementami dyskusji)'],
      cwiczenia_laboratorium: ['metoda projektów (projekt praktyczny)', 'rozwiązywanie zadań', 'burza mózgów']
    },
    praca_wlasna_studenta: 'Implementacja projektu frontendowego z użyciem nowoczesnych technologii (React, Vue, Angular); przygotowanie do egzaminu z zagadnień frontendowych; dokumentacja projektu.'
  },
  'TIN.json': {
    kryteria_oceny: {
      wyklad: ['kolokwium'],
      cwiczenia_laboratorium: ['ocena sporządzonego oprogramowania', 'prezentacja projektu i dokumentacji']
    },
    metody_dydaktyczne: {
      wyklad: ['wykład z prezentacją multimedialną', 'wykład konwersatoryjny (z elementami dyskusji)'],
      cwiczenia_laboratorium: ['metoda projektów (projekt praktyczny)', 'rozwiązywanie zadań', 'burza mózgów']
    },
    praca_wlasna_studenta: 'Implementacja projektu z technologii internetowych; ćwiczenia z protokołów sieciowych i usług webowych; przygotowanie do kolokwium pisemnego.'
  },
  'UKOS.json': {
    kryteria_oceny: {
      wyklad: [],
      cwiczenia_laboratorium: ['kolokwium', 'ocena pracy podczas ćwiczenia']
    },
    metody_dydaktyczne: {
      wyklad: ['wykład z prezentacją multimedialną'],
      cwiczenia_laboratorium: ['rozwiązywanie zadań', 'warsztaty', 'praca w grupach']
    },
    praca_wlasna_studenta: 'Samodzielna praca ze skryptami systemowymi; ćwiczenia z poleceń terminala i podstaw systemów operacyjnych; przygotowanie do kolokwiów i wykonywanie prac domowych.'
  },
  'WDZ.json': {
    kryteria_oceny: {
      wyklad: [],
      cwiczenia_laboratorium: ['kolokwium', 'ocena pracy podczas ćwiczenia', 'prezentacja elementu zespołowej pracy semestralnej']
    },
    metody_dydaktyczne: {
      wyklad: ['wykład z prezentacją multimedialną'],
      cwiczenia_laboratorium: ['praca w grupach', 'studia przypadków z bazy studiów przypadków opracowanych przez firmy MŚP lub będące efektem staży', 'dyskusja']
    },
    praca_wlasna_studenta: 'Realizacja projektu zespołowego z analizy wybranej organizacji; przygotowanie do kolokwium z treści wykładów; lektura wskazanych materiałów z zarządzania.'
  },
  'WF1.json': {
    kryteria_oceny: {
      wyklad: [],
      cwiczenia_laboratorium: ['ocena pracy podczas ćwiczenia']
    },
    metody_dydaktyczne: {
      wyklad: [],
      cwiczenia_laboratorium: ['praca w grupach']
    },
    praca_wlasna_studenta: 'Aktywność fizyczna poza zajęciami (np. zajęcia sportowe spoza oferty uczelni); dbanie o kondycję fizyczną; uzyskanie zaświadczenia z zajęć zewnętrznych w razie potrzeby.'
  },
  'WF2.json': {
    kryteria_oceny: {
      wyklad: [],
      cwiczenia_laboratorium: ['ocena pracy podczas ćwiczenia']
    },
    metody_dydaktyczne: {
      wyklad: [],
      cwiczenia_laboratorium: ['praca w grupach']
    },
    praca_wlasna_studenta: 'Aktywność fizyczna poza zajęciami (np. zajęcia sportowe spoza oferty uczelni); dbanie o kondycję fizyczną; uzyskanie zaświadczenia z zajęć zewnętrznych w razie potrzeby.'
  },
  'WG1.json': {
    kryteria_oceny: {
      wyklad: [],
      cwiczenia_laboratorium: ['prezentacja projektu i dokumentacji', 'ocena sporządzonego oprogramowania']
    },
    metody_dydaktyczne: {
      wyklad: ['wykład z prezentacją multimedialną', 'wykład konwersatoryjny (z elementami dyskusji)'],
      cwiczenia_laboratorium: ['metoda projektów (projekt praktyczny)', 'praca w grupach', 'burza mózgów']
    },
    praca_wlasna_studenta: 'Projektowanie i wytwarzanie gry w Unreal Engine; programowanie mechanik rozgrywki; praca w grupie projektowej; przygotowanie prezentacji projektu.'
  },
  'WG2.json': {
    kryteria_oceny: {
      wyklad: [],
      cwiczenia_laboratorium: ['prezentacja projektu i dokumentacji', 'ocena sporządzonego oprogramowania']
    },
    metody_dydaktyczne: {
      wyklad: ['wykład z prezentacją multimedialną', 'wykład konwersatoryjny (z elementami dyskusji)'],
      cwiczenia_laboratorium: ['metoda projektów (projekt praktyczny)', 'praca w grupach', 'burza mózgów']
    },
    praca_wlasna_studenta: 'Rozwijanie i doskonalenie gry komputerowej w Unreal Engine; praca w grupie; przygotowanie końcowej prezentacji projektu z pełną oceną styl/rozgrywka/zabawa/kreatywność.'
  },
  'WPR.json': {
    kryteria_oceny: {
      wyklad: [],
      cwiczenia_laboratorium: ['kolokwium', 'ocena sporządzonego oprogramowania', 'prezentacja projektu i dokumentacji']
    },
    metody_dydaktyczne: {
      wyklad: ['wykład z prezentacją multimedialną'],
      cwiczenia_laboratorium: ['rozwiązywanie zadań', 'metoda projektów (projekt praktyczny)', 'warsztaty']
    },
    praca_wlasna_studenta: 'Realizacja zadań laboratoryjnych poza zajęciami; praca nad projektem semestralnym; ćwiczenia z narzędzi programistycznych (Git, IDE, debugger); przygotowanie do kolokwium.'
  },
  'ZIC.json': {
    kryteria_oceny: {
      wyklad: ['egzamin pisemny z zadaniami problemowymi'],
      cwiczenia_laboratorium: ['raport z wykonanego zadania', 'prezentacja projektu i dokumentacji', 'obrona projektu']
    },
    metody_dydaktyczne: {
      wyklad: ['wykład z prezentacją multimedialną', 'wykład z prezentacją oprogramowania'],
      cwiczenia_laboratorium: ['metoda projektów (projekt praktyczny)', 'rozwiązywanie zadań', 'warsztaty']
    },
    praca_wlasna_studenta: 'Definiowanie infrastruktury jako kodu z użyciem Terraform i Ansible; praca z LocalStack i OpenStack; przygotowanie sprawozdań i projektu końcowego dotyczącego wdrożenia infrastruktury chmurowej.'
  },
  'ZPR.json': {
    kryteria_oceny: {
      wyklad: [],
      cwiczenia_laboratorium: ['prezentacja projektu i dokumentacji', 'ocena pracy podczas ćwiczenia']
    },
    metody_dydaktyczne: {
      wyklad: [],
      cwiczenia_laboratorium: ['metoda projektów (projekt praktyczny)', 'praca w grupach', 'dyskusja', 'burza mózgów', 'studia przypadków z bazy studiów przypadków opracowanych przez firmy MŚP lub będące efektem staży']
    },
    praca_wlasna_studenta: 'Tworzenie planu zarządzania projektem informatycznym w grupie; analiza realnych projektów IT; przygotowanie prezentacji planu zarządzania; opracowanie dokumentacji projektowej.'
  },
  'ZZGA.json': {
    kryteria_oceny: {
      wyklad: [],
      cwiczenia_laboratorium: ['ocena sporządzonego oprogramowania', 'obrona projektu']
    },
    metody_dydaktyczne: {
      wyklad: ['wykład z prezentacją multimedialną', 'wykład konwersatoryjny (z elementami dyskusji)'],
      cwiczenia_laboratorium: ['metoda projektów (projekt praktyczny)', 'warsztaty']
    },
    praca_wlasna_studenta: 'Samodzielna implementacja zaawansowanych projektów z grafiki i animacji; ćwiczenia z narzędzi (Blender, Adobe AE, Unity); przygotowanie i obrona pracy zaliczeniowej.'
  },
};

// Przetwarzanie każdego pliku
let updated = 0;
let skipped = 0;

for (const [filename, data] of Object.entries(subjectData)) {
  const filePath = join(syllabusDir, filename);
  let json;
  try {
    json = JSON.parse(readFileSync(filePath, 'utf8'));
  } catch (e) {
    console.warn(`Pominięto (brak pliku): ${filename}`);
    skipped++;
    continue;
  }

  const s = json.sylabus;
  const formy = s.forma_i_liczba_godzin_zajec;
  const hasWyklad = formy.wyklady && formy.wyklady > 0;
  const hasCwLab = (formy.cwiczenia_lektorat_seminarium && formy.cwiczenia_lektorat_seminarium > 0)
    || (formy.laboratorium_projekt && formy.laboratorium_projekt > 0);

  // Nowe kryteria_oceny
  s.kryteria_oceny = {
    wyklad: hasWyklad ? data.kryteria_oceny.wyklad : [],
    cwiczenia_laboratorium: hasCwLab ? data.kryteria_oceny.cwiczenia_laboratorium : []
  };

  // Nowe metody_dydaktyczne
  s.metody_dydaktyczne = {
    wyklad: hasWyklad ? data.metody_dydaktyczne.wyklad : [],
    cwiczenia_laboratorium: hasCwLab ? data.metody_dydaktyczne.cwiczenia_laboratorium : []
  };

  // Dodaj praca_wlasna_studenta do godziny
  s.godziny.praca_wlasna_studenta = data.praca_wlasna_studenta;

  // Migracja tresci_programowe: string[] -> {nr_zajec, wyklad, cwiczenia}[]
  if (Array.isArray(s.tresci_programowe) && s.tresci_programowe.length > 0) {
    if (typeof s.tresci_programowe[0] === 'string') {
      s.tresci_programowe = s.tresci_programowe.map((t, i) => ({
        nr_zajec: i + 1,
        wyklad: t,
        cwiczenia: ''
      }));
    }
  }

  // Dodaj nowe pola jeśli nie istnieją
  if (!s.hasOwnProperty('informacje_dodatkowe')) {
    s.informacje_dodatkowe = '';
  }
  if (!s.hasOwnProperty('rynek_pracy')) {
    s.rynek_pracy = {
      dziedzina_gospodarki: '',
      zawody: '',
      prace_dyplomowe: []
    };
  } else {
    if (!s.rynek_pracy.hasOwnProperty('dziedzina_gospodarki')) s.rynek_pracy.dziedzina_gospodarki = '';
    if (!s.rynek_pracy.hasOwnProperty('zawody'))               s.rynek_pracy.zawody = '';
    if (!s.rynek_pracy.hasOwnProperty('prace_dyplomowe'))      s.rynek_pracy.prace_dyplomowe = [];
  }
  if (!s.hasOwnProperty('wymagania_laboratorium')) {
    s.wymagania_laboratorium = {
      pc_params: [],
      software: [],
      wyposazenie_dodatkowe: []
    };
  } else {
    if (!s.wymagania_laboratorium.hasOwnProperty('pc_params'))             s.wymagania_laboratorium.pc_params = [];
    if (!s.wymagania_laboratorium.hasOwnProperty('software'))              s.wymagania_laboratorium.software = [];
    if (!s.wymagania_laboratorium.hasOwnProperty('wyposazenie_dodatkowe')) s.wymagania_laboratorium.wyposazenie_dodatkowe = [];
  }

  writeFileSync(filePath, JSON.stringify(json, null, 4), 'utf8');
  console.log(`✓ ${filename}`);
  updated++;
}

console.log(`\nZaktualizowano: ${updated} plików, pominięto: ${skipped}`);


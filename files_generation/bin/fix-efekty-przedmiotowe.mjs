/**
 * fix-efekty-przedmiotowe.mjs
 * Zastępuje efekty kształcenia w sylabusach nowymi, szczegółowymi,
 * zgodnymi z kierunkowymi efektami uczenia się (efekty_ksztalcenia.json).
 */
import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));

// Nowe efekty dla każdego przedmiotu (kod → {wiedza, umiejetnosci, kompetencje_spoleczne})
const NOWE_EFEKTY = {

  // ── BYT ──────────────────────────────────────────────────────────────────────
  BYT: {
    wiedza: [
      "Student zna i rozumie zaawansowane pojęcia w zakresie sieci komputerowych, protokołów komunikacyjnych i mechanizmów bezpieczeństwa sieciowego, w tym firewalle, systemy IDS/IPS oraz wirtualne sieci prywatne (VPN). [K_W08]",
      "Student zna i rozumie zaawansowane zagadnienia relacyjnych baz danych: modelowanie ERD, normalizację, transakcje, indeksy oraz programowanie SQL w kontekście bezpieczeństwa danych. [K_W13]",
      "Student zna i rozumie zasady inżynierii oprogramowania, wzorce projektowe (GoF), notację UML, cykle wytwórcze (Agile/Scrum) oraz problem jakości oprogramowania i techniczny dług. [K_W14]",
      "Student zna i rozumie metody i techniki inżynierii wymagań, sposoby tworzenia specyfikacji funkcjonalnych i niefunkcjonalnych oraz narzędzia do modelowania wymagań (m.in. diagramy przypadków użycia). [K_W15]",
      "Student zna i rozumie zaawansowane metody walidacji i testowania oprogramowania: testy jednostkowe, integracyjne, systemowe i akceptacyjne, a także narzędzia do automatyzacji testów i analizy pokrycia kodu. [K_W16]"
    ],
    umiejetnosci: [
      "Student potrafi zaprojektować, zainstalować i administrować siecią LAN/WAN z zachowaniem zasad bezpieczeństwa informacji, skonfigurować usługi sieciowe oraz reagować na incydenty bezpieczeństwa. [K_U14]",
      "Student potrafi sformułować zapytania SQL, zaprojektować schemat relacyjnej bazy danych na podstawie modelu ERD oraz zarządzać transakcjami i uprawnieniami w systemie bazodanowym. [K_U18]",
      "Student potrafi zaplanować i zrealizować projekt programistyczny metodą obiektową z zastosowaniem wzorców projektowych, narzędzi CI/CD oraz systemów kontroli wersji (Git). [K_U19]",
      "Student potrafi zaplanować i przeprowadzić pełny proces testowania oprogramowania: opracować plan testów, napisać testy automatyczne (JUnit/NUnit/pytest), wykonać testy regresji i zinterpretować wyniki. [K_U22]",
      "Student potrafi przeprowadzić inspekcję kodu, zidentyfikować defekty i poprawić jakość oprogramowania zgodnie z przyjętymi standardami (SOLID, Clean Code). [K_U21]"
    ],
    kompetencje_spoleczne: [
      "Student jest gotów do pracy w zespole deweloperskim w zróżnicowanych rolach (deweloper, tester, analityk), stosując metodyki zwinne i dobre praktyki inżynierii oprogramowania. [K_K04]",
      "Student jest gotów do samodzielnego poszerzania wiedzy z zakresu bezpieczeństwa systemów informatycznych i nowych technologii wytwarzania oprogramowania. [K_K03]",
      "Student jest gotów do dostrzegania i profesjonalnego rozwiązywania problemów etycznych i prawnych związanych z bezpieczeństwem danych i odpowiedzialnością inżynierską. [K_K06]"
    ]
  },

  // ── SOP ──────────────────────────────────────────────────────────────────────
  SOP: {
    wiedza: [
      "Student zna i rozumie zasady działania systemów operacyjnych: zarządzanie procesami, wątkami i pamięcią wirtualną, mechanizmy współbieżności oraz organizację systemu plików w popularnych systemach (Linux, Windows). [K_W07]",
      "Student zna i rozumie algorytmy szeregowania procesów (FCFS, SJF, Round-Robin, priorytety) i rozumie ich wpływ na wydajność systemu w różnych scenariuszach obciążenia. [K_W07]",
      "Student zna i rozumie klasyczne problemy synchronizacji (sekcja krytyczna, producent-konsument, czytelnicy-pisarze) oraz mechanizmy ich rozwiązania: semafory, muteksy, zmienne warunkowe, monitory. [K_W07]"
    ],
    umiejetnosci: [
      "Student potrafi zainstalować, skonfigurować i administrować systemem operacyjnym Linux (zarządzanie użytkownikami, uprawnieniami, usługami systemd, przestrzenią dyskową i siecią). [K_U13]",
      "Student potrafi implementować programy wielowątkowe/wieloprocesowe w języku C/C++ z użyciem POSIX API (pthread, fork/exec, pipe, sygnały) oraz identyfikować i eliminować wyścigi danych i zakleszczenia. [K_U13]",
      "Student potrafi dobrać i skonfigurować system operacyjny do wymagań aplikacji, z uwzględnieniem wymagań czasu rzeczywistego i bezpieczeństwa. [K_U13]"
    ],
    kompetencje_spoleczne: [
      "Student jest gotów do samodzielnego rozwiązywania problemów administracyjnych i konfiguracyjnych systemów operacyjnych, korzystając z dokumentacji i zasobów społeczności open-source. [K_K03]",
      "Student jest gotów do świadomego wyboru narzędzi i konfiguracji systemowych z uwzględnieniem ich wpływu na bezpieczeństwo i niezawodność systemu informatycznego. [K_K06]"
    ]
  },

  // ── UKOS ─────────────────────────────────────────────────────────────────────
  UKOS: {
    wiedza: [
      "Student zna i rozumie zasady działania systemów operacyjnych: zarządzanie zasobami, organizację współbieżności, systemy plików i mechanizmy bezpieczeństwa w środowiskach Windows i Linux. [K_W07]",
      "Student zna i rozumie zaawansowane pojęcia z zakresu sieci komputerowych: modele OSI/TCP-IP, konfigurację protokołów sieciowych, usługi katalogowe (Active Directory/LDAP) oraz wirtualizację sieci. [K_W08]"
    ],
    umiejetnosci: [
      "Student potrafi zainstalować, skonfigurować i administrować systemem operacyjnym (Windows Server / Linux) w środowisku wirtualnym lub fizycznym, zarządzając użytkownikami, uprawnieniami i usługami. [K_U13]",
      "Student potrafi zaprojektować i skonfigurować infrastrukturę sieciową LAN/WAN, w tym usługi DHCP, DNS, NAT, firewall, a także przeprowadzić podstawową analizę ruchu sieciowego. [K_U14]",
      "Student potrafi zaplanować i przeprowadzić proces instalacji i uruchomienia kompletnego systemu informatycznego (system operacyjny, baza danych, aplikacja webowa). [K_U27]"
    ],
    kompetencje_spoleczne: [
      "Student jest gotów do samodzielnego uczenia się nowych technologii systemowych i sieciowych w oparciu o dokumentację techniczną i zasoby społeczności. [K_K03]",
      "Student jest gotów do odpowiedzialnego zarządzania infrastrukturą informatyczną z uwzględnieniem zasad bezpieczeństwa i ochrony danych. [K_K06]"
    ]
  },

  // ── RBD ──────────────────────────────────────────────────────────────────────
  RBD: {
    wiedza: [
      "Student zna i rozumie zasady modelowania danych (model związków i encji ERD, model relacyjny) oraz teorię normalizacji baz danych (1NF–BCNF) i jej znaczenie dla integralności i wydajności systemu. [K_W13]",
      "Student zna i rozumie zaawansowane możliwości języka SQL: podzapytania, złączenia (JOIN), widoki, procedury składowane, wyzwalacze i transakcje z różnymi poziomami izolacji. [K_W13]",
      "Student zna i rozumie architekturę i zasady działania popularnych systemów RDBMS (PostgreSQL, MySQL, SQL Server), mechanizmy indeksowania i optymalizacji zapytań. [K_W13]"
    ],
    umiejetnosci: [
      "Student potrafi zaprojektować schemat relacyjnej bazy danych na podstawie wymagań, stosując normalizację, klucze obce i ograniczenia integralności. [K_U18]",
      "Student potrafi pisać złożone zapytania SQL (w tym agregacje, podzapytania, złączenia wielu tabel) oraz implementować procedury składowane i wyzwalacze. [K_U18]",
      "Student potrafi zarządzać transakcjami, konfigurować uprawnienia użytkowników oraz przeprowadzać tworzenie kopii zapasowych i odtwarzanie bazy danych. [K_U18]",
      "Student potrafi zaplanować i zrealizować migrację danych oraz integrację bazy danych z aplikacją backendową. [K_U27]"
    ],
    kompetencje_spoleczne: [
      "Student jest gotów do samodzielnego projektowania i optymalizacji rozwiązań bazodanowych w projektach inżynierskich z uwzględnieniem wymagań wydajnościowych i bezpieczeństwa danych. [K_K05]",
      "Student jest gotów do ciągłego poszerzania wiedzy o nowych technologiach bazodanowych, w tym NoSQL i bazach czasu rzeczywistego. [K_K03]"
    ]
  },

  // ── ZPR ──────────────────────────────────────────────────────────────────────
  ZPR: {
    wiedza: [
      "Student zna i rozumie zaawansowane koncepcje inżynierii oprogramowania: modele procesów wytwórczych (Waterfall, Scrum, Kanban, SAFe), zarządzanie konfiguracją i zmianą oraz ewolucję oprogramowania. [K_W14]",
      "Student zna i rozumie zasady planowania przedsięwzięcia informatycznego: szacowanie kosztów i czasu (metoda punktów funkcyjnych, Planning Poker), zarządzanie ryzykiem i budżetem projektu. [K_W17]",
      "Student zna i rozumie podstawowe problemy etyczne i prawne informatyki, w tym prawo autorskie, ochronę danych osobowych (RODO), odpowiedzialność zawodową i kodeksy etyki informatycznej. [K_W19]",
      "Student zna i rozumie podstawy prowadzenia działalności gospodarczej w sektorze IT: modele biznesowe, startupy technologiczne, outsourcing, innowacyjność i komercjalizacja oprogramowania. [K_W20]"
    ],
    umiejetnosci: [
      "Student potrafi pracować efektywnie w zespole projektowym, szacować nakłady pracy, budować harmonogram (Gantt, backlog, sprint planning) i monitorować postęp projektu z użyciem narzędzi (Jira, GitHub Projects). [K_U05]",
      "Student potrafi zaplanować i wytworzyć dokumentację projektową: kartę projektu, analizę ryzyka, specyfikację wymagań i raport końcowy z uwzględnieniem aspektów ekonomicznych i społecznych. [K_U26]",
      "Student potrafi uwzględnić społeczny, etyczny i prawny kontekst przedsięwzięcia informatycznego i ocenić związane z nim zagrożenia. [K_U25]"
    ],
    kompetencje_spoleczne: [
      "Student jest gotów do efektywnej współpracy w zespole deweloperskim, przyjmując różne role (Scrum Master, Product Owner, deweloper) i biorąc odpowiedzialność za przydzielone zadania. [K_K04]",
      "Student jest gotów do myślenia przedsiębiorczego i innowacyjnego w kontekście projektów informatycznych, dostrzegając możliwości komercjalizacji rozwiązań. [K_K07]",
      "Student jest gotów do przekazywania informacji na temat projektu interesariuszom technicznym i nietechnicznym w sposób zrozumiały i skuteczny. [K_K08]"
    ]
  },

  // ── PRIN ─────────────────────────────────────────────────────────────────────
  PRIN: {
    wiedza: [
      "Student zna i rozumie podstawowe zagadnienia planowania przedsięwzięcia informatycznego: wstępną ocenę ekonomiczną, analizę wykonalności, aspekty społeczne i środowiskowe projektu IT. [K_W17]",
      "Student zna i rozumie podstawowe problemy etyczne, społeczne i zawodowe informatyki: odpowiedzialność zawodowa, prawo autorskie, licencjonowanie oprogramowania i ochrona własności intelektualnej. [K_W19]",
      "Student zna i rozumie ogólne zasady tworzenia przedsiębiorczości w IT: modele biznesowe, formy prawne działalności, zasady komercjalizacji rozwiązań informatycznych i pozyskiwania finansowania. [K_W20]"
    ],
    umiejetnosci: [
      "Student potrafi pracować w zespole projektowym, szacować czas i koszty realizacji zadań oraz budować harmonogram prac zapewniający terminową realizację projektu informatycznego. [K_U05]",
      "Student potrafi zaplanować i wytworzyć dokumentację przedsięwzięcia informatycznego (studium wykonalności, analiza ryzyka, wstępna wycena) z uwzględnieniem aspektów etycznych i prawnych. [K_U26]",
      "Student potrafi uwzględnić aspekty etyczne, prawne i społeczne w planowanym przedsięwzięciu informatycznym i ocenić potencjalne zagrożenia. [K_U25]"
    ],
    kompetencje_spoleczne: [
      "Student jest gotów do zastosowań informatyki na rzecz rozwoju nauki i społeczeństwa informacyjnego, działając zgodnie z zasadami etyki zawodowej. [K_K01]",
      "Student jest gotów do efektywnej współpracy w zespole, przyjmowania różnych ról i odpowiedzialnego wywiązywania się z powierzonych zadań projektowych. [K_K04]",
      "Student jest gotów do przekazywania społeczeństwu informacji na temat konsekwencji i odpowiedzialności związanej z działalnością inżynierską w IT. [K_K02]"
    ]
  },

  // ── POZ ──────────────────────────────────────────────────────────────────────
  POZ: {
    wiedza: [
      "Student zna i rozumie podstawowe zasady planowania przedsięwzięcia informatycznego, wstępnej oceny ekonomicznej i analizy wykonalności z uwzględnieniem aspektów społecznych i ryzyka. [K_W17]",
      "Student zna i rozumie podstawowe problemy etyczne i prawne informatyki: ochronę własności intelektualnej, prawo autorskie, odpowiedzialność zawodową i zagadnienia prywatności danych. [K_W19]",
      "Student zna i rozumie ogólne zasady prowadzenia działalności gospodarczej w branży IT, w tym tworzenia startupów i innowacyjnych przedsięwzięć informatycznych. [K_W20]"
    ],
    umiejetnosci: [
      "Student potrafi przeanalizować projekt informatyczny pod kątem jego wpływu na otoczenie społeczne i ekonomicznego uzasadnienia realizacji. [K_U26]",
      "Student potrafi uwzględnić społeczny, etyczny i prawny kontekst przedsięwzięcia informatycznego i ocenić związane z nim zagrożenia dla różnych interesariuszy. [K_U25]"
    ],
    kompetencje_spoleczne: [
      "Student jest gotów do przekazywania informacji i opinii o projektach informatycznych w sposób powszechnie zrozumiały, z uwzględnieniem potrzeb różnych grup odbiorców. [K_K02]",
      "Student jest gotów do myślenia i działania w sposób przedsiębiorczy i innowacyjny w kontekście tworzenia przedsięwzięć informatycznych. [K_K07]"
    ]
  },

  // ── KIP ──────────────────────────────────────────────────────────────────────
  KIP: {
    wiedza: [
      "Student zna i rozumie zaawansowane pojęcia z zakresu techniki cyfrowej i architektury systemów komputerowych: układy kombinacyjne i sekwencyjne, architekturę ARM/RISC-V, organizację pamięci i magistral komunikacyjnych. [K_W06]",
      "Student zna i rozumie zaawansowane zagadnienia mikrokontrolerów i systemów wbudowanych stosowanych w IoT: programowanie bare-metal i RTOS-based, interfejsy peryferyjne (I2C, SPI, UART, CAN), zarządzanie energią. [K_W18]",
      "Student zna i rozumie zaawansowane pojęcia w zakresie Internetu Rzeczy: protokoły komunikacyjne warstwy aplikacji (MQTT, CoAP, HTTP/REST), architektury IoT (edge, fog, cloud), bezpieczeństwo urządzeń IoT. [K_W26]"
    ],
    umiejetnosci: [
      "Student potrafi zaprojektować proste układy cyfrowe, napisać program w asemblerze dla mikrokontrolera oraz zintegrować peryferyjne moduły sprzętowe z systemem wbudowanym. [K_U12]",
      "Student potrafi przeanalizować, zsyntezować i oprogramować system wbudowany IoT: skonfigurować interfejsy sensorów i aktuatorów, zaimplementować stos komunikacyjny i zapewnić niezawodność systemu. [K_U23]",
      "Student potrafi zdiagnozować problem inżynierski w dziedzinie IoT, zaprojektować rozwiązanie i zrealizować prototyp z użyciem dostępnych platform (ESP32, Raspberry Pi, Arduino). [K_U33]"
    ],
    kompetencje_spoleczne: [
      "Student jest gotów do zastosowania technologii IoT na rzecz rozwoju innowacyjnych rozwiązań w przemyśle, rolnictwie, medycynie i inteligentnych miastach. [K_K01]",
      "Student jest gotów do samodzielnego pogłębiania wiedzy z dynamicznie rozwijającego się obszaru systemów wbudowanych i Internetu Rzeczy. [K_K03]"
    ]
  },

  // ── LLP ──────────────────────────────────────────────────────────────────────
  LLP: {
    wiedza: [
      "Student zna i rozumie zaawansowane pojęcia z zakresu architektury i organizacji systemów komputerowych: model von Neumanna, pipeline, pamięć podręczna (cache), architekturę wielordzeniową i zestawy instrukcji (x86-64, ARM). [K_W06]",
      "Student zna i rozumie zasady programowania na poziomie asemblera: reprezentacje liczb (U2, IEEE 754), arytmetykę binarną, tryby adresowania, wywołania systemowe i konwencje wywoływania funkcji. [K_W06]"
    ],
    umiejetnosci: [
      "Student potrafi zaprojektować proste układy kombinacyjne i sekwencyjne, obliczyć reprezentacje liczb całkowitych i zmiennoprzecinkowych oraz napisać programy w asemblerze x86-64 realizujące zadane algorytmy. [K_U12]",
      "Student potrafi analizować kod maszynowy i asemblerowy wygenerowany przez kompilator C/C++, identyfikować optymalizacje i rozumieć niskopoziomowe aspekty wykonania programu. [K_U12]"
    ],
    kompetencje_spoleczne: [
      "Student jest gotów do samodzielnego zgłębiania wiedzy z zakresu architektury procesorów i programowania niskopoziomowego w oparciu o dokumentację producentów i literaturę branżową. [K_K03]",
      "Student jest gotów do stosowania wiedzy o niskopoziomowej architekturze systemów przy projektowaniu wydajnego i bezpiecznego oprogramowania. [K_K05]"
    ]
  },

  // ── SWB ──────────────────────────────────────────────────────────────────────
  SWB: {
    wiedza: [
      "Student zna i rozumie zaawansowane zagadnienia projektowania systemów wbudowanych: dobór mikrokontrolera/procesora, organizacja pamięci, zarządzanie energią (tryby uśpienia, dynamiczne skalowanie napięcia/częstotliwości) i certyfikacja bezpieczeństwa (IEC 61508). [K_W18]",
      "Student zna i rozumie zaawansowane pojęcia IoT w kontekście systemów wbudowanych: stosy protokołów sieciowych dla urządzeń IoT (Zigbee, Z-Wave, LoRaWAN, NB-IoT), OTA updates i zarządzanie flotą urządzeń. [K_W26]"
    ],
    umiejetnosci: [
      "Student potrafi przeanalizować wymagania i zsyntezować architekturę systemu wbudowanego, oprogramować go w C/C++ z użyciem HAL (STM32 HAL, ESP-IDF), zintegrować peryferia i przetestować niezawodność. [K_U23]",
      "Student potrafi zaprojektować i zaimplementować komunikację między systemem wbudowanym a chmurą (MQTT broker, REST API, WebSocket) z zachowaniem wymagań bezpieczeństwa. [K_U33]"
    ],
    kompetencje_spoleczne: [
      "Student jest gotów do zastosowania systemów wbudowanych w rozwiązaniach IoT i automatyce przemysłowej z uwzględnieniem aspektów bezpieczeństwa i niezawodności. [K_K01]",
      "Student jest gotów do samodzielnego poszerzania kompetencji z zakresu nowych platform sprzętowych i metodyk projektowania systemów wbudowanych. [K_K03]"
    ]
  },

  // ── PTT ──────────────────────────────────────────────────────────────────────
  PTT: {
    wiedza: [
      "Student zna i rozumie zaawansowane zagadnienia prototypowania urządzeń IoT: dobór platformy sprzętowej, szybkie wytwarzanie PCB i obudów metodami addytywnymi (druk 3D), metodyki Agile Hardware Development. [K_W18]",
      "Student zna i rozumie zaawansowane pojęcia Internetu Rzeczy: architektury połączeń (MQTT, CoAP), integrację z platformami chmurowymi (AWS IoT, Azure IoT Hub, Google Cloud IoT), zbieranie i wizualizację danych (Grafana, InfluxDB). [K_W26]"
    ],
    umiejetnosci: [
      "Student potrafi zrealizować pełny cykl prototypowania urządzenia IoT: od projektu elektronicznego i oprogramowania wbudowanego, przez testy, do wdrożenia i monitorowania w środowisku produkcyjnym. [K_U23]",
      "Student potrafi zdiagnozować problem inżynierski w obszarze IoT i zaproponować rozwiązanie, dobierając odpowiednią platformę sprzętową, protokół komunikacyjny i usługi chmurowe. [K_U33]"
    ],
    kompetencje_spoleczne: [
      "Student jest gotów do zastosowań technologii IoT i prototypowania na rzecz rozwoju innowacyjnych produktów i rozwiązań społecznych. [K_K01]",
      "Student jest gotów do myślenia i działania w sposób innowacyjny, iteracyjnego doskonalenia prototypów na podstawie feedbacku użytkowników. [K_K07]"
    ]
  },

  // ── RTO ──────────────────────────────────────────────────────────────────────
  RTO: {
    wiedza: [
      "Student zna i rozumie specyfikę systemów czasu rzeczywistego (SCR): definicję twardego i miękkiego czasu rzeczywistego, wymagania dotyczące deterministyczności, niezawodności i bezpieczeństwa. [K_W18]",
      "Student zna i rozumie architektury RTOS (FreeRTOS, Zephyr, QNX): harmonogramowanie zadań (RM, EDF), zarządzanie przerwaniami, komunikację między zadaniami (kolejki, semafory, zdarzenia) i analizę czasu wykonania (WCET). [K_W26]",
      "Student zna i rozumie zastosowania systemów czasu rzeczywistego w automatyce przemysłowej, robotyce, medycynie i Internecie Rzeczy oraz powiązane standardy bezpieczeństwa (IEC 61131, DO-178). [K_W18]"
    ],
    umiejetnosci: [
      "Student potrafi zaprojektować i zaimplementować aplikację czasu rzeczywistego z użyciem RTOS, w tym zaplanować harmonogram zadań, zaimplementować synchronizację i spełnić ograniczenia czasowe. [K_U23]",
      "Student potrafi zdiagnozować problem specyficzny dla systemu IoT/RT, zaprojektować jego rozwiązanie z uwzględnieniem wymagań czasu rzeczywistego i bezpieczeństwa systemu wbudowanego. [K_U33]",
      "Student potrafi zastosować informatykę na rzecz rozwiązywania problemów automatyki i robotyki, przenosząc dobre praktyki projektowania systemów czasu rzeczywistego. [K_K01]"
    ],
    kompetencje_spoleczne: [
      "Student jest gotów do zastosowania systemów czasu rzeczywistego w rozwiązaniach przemysłowych i IoT, z uwzględnieniem wymogów certyfikacji i bezpieczeństwa. [K_K01]",
      "Student jest gotów do samodzielnego poszerzania wiedzy o nowych architekturach RTOS i standardach przemysłowych. [K_K03]"
    ]
  },

  // ── DEV ──────────────────────────────────────────────────────────────────────
  DEV: {
    wiedza: [
      "Student zna i rozumie zaawansowane zagadnienia sieci komputerowych w kontekście DevOps: wirtualizację sieci (SDN, overlay networks), protokoły routingu (BGP, OSPF), bezpieczeństwo sieciowe (TLS, mTLS, zero-trust) i monitoring sieci. [K_W08]",
      "Student zna i rozumie architekturę konteneryzacji (Docker, Kubernetes), zasady Infrastructure as Code (Terraform, Ansible), potoki CI/CD (GitHub Actions, GitLab CI) i modele chmurowe (AWS, GCP, Azure). [K_W08]"
    ],
    umiejetnosci: [
      "Student potrafi zaprojektować, zainstalować i administrować infrastrukturą sieciową z zachowaniem zasad bezpieczeństwa, stosując narzędzia automatyzacji i monitorowania. [K_U14]",
      "Student potrafi zbudować potok CI/CD automatyzujący budowanie, testowanie i wdrażanie aplikacji kontenerowej na klaster Kubernetes z użyciem deklaratywnej konfiguracji infrastruktury. [K_U14]"
    ],
    kompetencje_spoleczne: [
      "Student jest gotów do samodzielnego poszerzania wiedzy o dynamicznie rozwijającym się ekosystemie DevOps i chmurowym, śledzenia dokumentacji i społeczności open source. [K_K03]",
      "Student jest gotów do odpowiedzialnego zarządzania infrastrukturą z uwzględnieniem kosztów, bezpieczeństwa i zrównoważonego użytkowania zasobów chmurowych. [K_K06]"
    ]
  },

  // ── GRK ──────────────────────────────────────────────────────────────────────
  GRK: {
    wiedza: [
      "Student zna i rozumie matematyczne podstawy grafiki komputerowej: algebrę liniową (wektory, macierze transformacji, układy współrzędnych), geometrię obliczeniową i podstawy optyki geometrycznej. [K_W11]",
      "Student zna i rozumie zasady działania potoku renderowania GPU (vertex/fragment shader, rasteryzacja, z-buffer, blending) oraz podstawowe algorytmy syntezy obrazu: rzutowanie, oświetlenie (Phong, PBR), cieniowanie. [K_W11]",
      "Student zna i rozumie podstawowe pojęcia z zakresu komunikacji człowiek-komputer: zasady użyteczności, projektowanie interfejsu graficznego (GUI) i zasady dostępności (WCAG). [K_W11]"
    ],
    umiejetnosci: [
      "Student potrafi zastosować aparat matematyczny (algebrę liniową, geometrię obliczeniową) do rozwiązywania problemów z zakresu grafiki komputerowej i transformacji przestrzennych. [K_U07]",
      "Student potrafi zaprogramować aplikację grafiki 2D i 3D z użyciem nowoczesnego API (OpenGL 4.x / Vulkan / WebGL) lub silnika (Unity/Godot), implementując shadery i efekty postprocessingu. [K_U17]",
      "Student potrafi zaprojektować i zaimplementować graficzny interfejs użytkownika z uwzględnieniem zasad użyteczności i przeprowadzić podstawowe testy użyteczności. [K_U17]"
    ],
    kompetencje_spoleczne: [
      "Student jest gotów do samodzielnego rozwijania kompetencji w dynamicznie zmieniającym się obszarze grafiki komputerowej i GPU computing. [K_K03]",
      "Student jest gotów do krytycznej oceny rozwiązań graficznych pod kątem wydajności, jakości wizualnej i dostępności dla użytkownika końcowego. [K_K05]"
    ]
  },

  // ── ZZGA ─────────────────────────────────────────────────────────────────────
  ZZGA: {
    wiedza: [
      "Student zna i rozumie zaawansowane pojęcia w zakresie grafiki komputerowej 2D i 3D: potok renderowania, algorytmy śledzenia promieni (ray tracing), global illumination, HDR i techniki postprocessingu. [K_W11]",
      "Student zna i rozumie zaawansowane metody przetwarzania i kompresji obrazów cyfrowych: transformaty (DCT, DWT), kodeki wideo, algorytmy segmentacji i analizy obrazu. [K_W11]"
    ],
    umiejetnosci: [
      "Student potrafi zastosować aparat matematyczny (transformaty, algebrę liniową) do interpretowania i rozwiązywania problemów z zakresu zaawansowanej grafiki komputerowej. [K_U07]",
      "Student potrafi dobierać i implementować algorytmy przetwarzania i kompresji obrazu odpowiednie do zadanego problemu technicznego. [K_U17]"
    ],
    kompetencje_spoleczne: [
      "Student jest gotów do samodzielnego uczenia się przez całe życie w obszarze zaawansowanej grafiki i przetwarzania obrazów. [K_K03]",
      "Student jest gotów do zastosowania technik graficznych w rozwiązywaniu problemów interdyscyplinarnych (medycyna, przemysł, rozrywka). [K_K01]"
    ]
  },

  // ── OGL ──────────────────────────────────────────────────────────────────────
  OGL: {
    wiedza: [
      "Student zna i rozumie zaawansowane zagadnienia programowania grafiki 3D z użyciem OpenGL: architekturę potoku renderowania, programowanie shaderów (GLSL), techniki oświetlenia (shadow mapping, ambient occlusion, PBR). [K_W11]",
      "Student zna i rozumie aktualne narzędzia i technologie grafiki 3D w czasie rzeczywistym: menedżery zasobów sceny, optymalizację (LOD, frustum culling, batching) i nowoczesne API (Vulkan/DirectX 12). [K_W11]"
    ],
    umiejetnosci: [
      "Student potrafi zaprojektować i zaprogramować zaawansowaną aplikację grafiki 3D z użyciem OpenGL lub nowszego API, implementując własne shadery, systemy cząsteczkowe i zaawansowane efekty wizualne. [K_U17]",
      "Student potrafi optymalizować aplikację graficzną pod kątem wydajności renderowania na nowoczesnym sprzęcie GPU. [K_U17]"
    ],
    kompetencje_spoleczne: [
      "Student jest gotów do samodzielnego uczenia się zaawansowanych technologii graficznych przez całe życie zawodowe. [K_K03]",
      "Student jest gotów do krytycznej oceny i doboru technologii graficznych do wymagań konkretnego projektu inżynierskiego. [K_K05]"
    ]
  },

  // ── IML ──────────────────────────────────────────────────────────────────────
  IML: {
    wiedza: [
      "Student zna i rozumie zaawansowane pojęcia probabilistyki i statystyki: rozkłady prawdopodobieństwa, estymację, testy hipotez i ich zastosowanie w uczeniu maszynowym. [K_W12]",
      "Student zna i rozumie zasady działania i zastosowania algorytmów uczenia maszynowego: regresja, klasyfikacja (SVM, drzewa decyzyjne, lasy losowe), klasteryzacja, redukcja wymiarowości (PCA) i metody ewaluacji modeli. [K_W12]",
      "Student zna i rozumie zaawansowane pojęcia w zakresie sztucznej inteligencji: głębokie sieci neuronowe (CNN, RNN, Transformer), transfer learning i zasady odpowiedzialnej AI. [K_W22]"
    ],
    umiejetnosci: [
      "Student potrafi zastosować aparat matematyczny (rachunek różniczkowy, algebrę liniową, statystykę) do implementacji i analizy algorytmów uczenia maszynowego w Pythonie (scikit-learn, PyTorch/TensorFlow). [K_U07]",
      "Student potrafi zdiagnozować problem z obszaru sztucznej inteligencji, zaprojektować pipeline danych, wytrenować, ocenić i zoptymalizować model ML/DL na danych rzeczywistych. [K_U29]"
    ],
    kompetencje_spoleczne: [
      "Student jest gotów do zastosowania sztucznej inteligencji na rzecz rozwiązywania problemów naukowych i społecznych z uwzględnieniem zasad etycznej AI. [K_K01]",
      "Student jest gotów do samodzielnego śledzenia postępów w dziedzinie ML/AI i adaptowania nowych metod w praktyce inżynierskiej. [K_K03]"
    ]
  },

  // ── BSI ──────────────────────────────────────────────────────────────────────
  BSI: {
    wiedza: [
      "Student zna i rozumie zaawansowane pojęcia z zakresu cyberbezpieczeństwa: kryptografię symetryczną i asymetryczną, protokoły bezpieczeństwa (TLS/SSL, Kerberos, PKI), bezpieczeństwo sieci i systemów operacyjnych. [K_W23]",
      "Student zna i rozumie metody oceny podatności systemów informatycznych, typologię ataków (OWASP Top 10, MITRE ATT&CK) i zasady bezpiecznego wytwarzania oprogramowania (SAST, DAST, DevSecOps). [K_W23]",
      "Student zna i rozumie zaawansowane zagadnienia sieci komputerowych w kontekście bezpieczeństwa: firewalle, systemy IDS/IPS, VPN, segmentację sieci i zasady zero-trust. [K_W08]"
    ],
    umiejetnosci: [
      "Student potrafi zdiagnozować problem cyberbezpieczeństwa, zaprojektować i wdrożyć rozwiązanie ochrony systemu informatycznego, przeprowadzić testy penetracyjne i analizę podatności. [K_U30]",
      "Student potrafi skonfigurować mechanizmy kontroli dostępu, szyfrowania danych i monitorowania bezpieczeństwa w systemach informatycznych. [K_U14]"
    ],
    kompetencje_spoleczne: [
      "Student jest gotów do odpowiedzialnego projektowania bezpiecznych systemów informatycznych z uwzględnieniem etycznych aspektów ochrony danych i prywatności użytkowników. [K_K06]",
      "Student jest gotów do samodzielnego poszerzania wiedzy o nowych zagrożeniach i technikach obrony w dynamicznie zmieniającym się krajobrazie cyberbezpieczeństwa. [K_K03]"
    ]
  },

  // ── SAD ──────────────────────────────────────────────────────────────────────
  SAD: {
    wiedza: [
      "Student zna i rozumie zaawansowane zagadnienia probabilistyki i statystyki: rozkłady prawdopodobieństwa, procesy stochastyczne, łańcuchy Markowa, teorię kolejek i metody Monte Carlo w kontekście zastosowań informatycznych. [K_W12]",
      "Student zna i rozumie metody statystycznej analizy danych: estymację parametryczną i nieparametryczną, testowanie hipotez, regresję liniową i podstawy analizy bayesowskiej. [K_W12]"
    ],
    umiejetnosci: [
      "Student potrafi zastosować aparat matematyczny statystyki do analizy danych informatycznych, implementować modele probabilistyczne i interpretować wyniki analiz statystycznych. [K_U07]",
      "Student potrafi posługiwać się narzędziami analityki danych (Python: NumPy, SciPy, pandas, matplotlib) do eksploracji i wizualizacji danych oraz budowy podstawowych modeli predykcyjnych. [K_U07]"
    ],
    kompetencje_spoleczne: [
      "Student jest gotów do zastosowania metod statystycznych w analizie danych na rzecz rozwiązywania problemów naukowych i inżynierskich. [K_K01]",
      "Student jest gotów do samodzielnego uczenia się przez całe życie, aktualizując wiedzę z zakresu statystyki i analizy danych. [K_K03]"
    ]
  },

  // ── ASD ──────────────────────────────────────────────────────────────────────
  ASD: {
    wiedza: [
      "Student zna i rozumie podstawowe pojęcia w zakresie algorytmiki: złożoność czasową i pamięciową algorytmów (notacja O, Omega, Theta), algorytmy sortowania, wyszukiwania i algorytmy grafowe. [K_W04]",
      "Student zna i rozumie zaawansowane zagadnienia algorytmiczne: algorytmy zachłanne, programowanie dynamiczne, drzewa binarne (BST, AVL, czerwono-czarne), tablice haszujące i algorytmy grafowe (BFS, DFS, Dijkstra, Floyd-Warshall). [K_W05]",
      "Student zna i rozumie podstawy teorii złożoności obliczeniowej: klasy P i NP, problemy NP-zupełne, metody redukcji, automaty skończone i języki formalne. [K_W05]"
    ],
    umiejetnosci: [
      "Student potrafi przeanalizować złożoność algorytmu, dobrać i zaimplementować odpowiednie struktury danych oraz algorytmy dla zadanego problemu inżynierskiego w C++/Pythonie/C#. [K_U11]",
      "Student potrafi zaprojektować i zweryfikować poprawność algorytmu z użyciem logiki Hoare'a oraz oszacować jego koszt obliczeniowy metodami asymptotycznymi. [K_U11]"
    ],
    kompetencje_spoleczne: [
      "Student jest gotów do stosowania zaawansowanych technik algorytmicznych w rozwiązywaniu złożonych problemów inżynierskich, wykazując się krytycznym myśleniem i precyzją. [K_K05]",
      "Student jest gotów do samodzielnego uczenia się nowych algorytmów i technik obliczeniowych niezbędnych w pracy inżyniera oprogramowania. [K_K03]"
    ]
  },

  // ── ELK ──────────────────────────────────────────────────────────────────────
  ELK: {
    wiedza: [
      "Student zna i rozumie podstawowe prawa i zjawiska elektryczne: prawo Ohma, prawa Kirchhoffa, zasady działania obwodów prądu stałego i przemiennego, elementy pasywne (rezystory, kondensatory, cewki) i podstawy półprzewodnikowe. [K_W02]",
      "Student zna i rozumie podstawy elektrotechniki i elektroniki w kontekście informatyki: interfejsy elektryczne układów cyfrowych (TTL, CMOS), analogowe układy wzmacniające i konwersja A/D i D/A. [K_W03]"
    ],
    umiejetnosci: [
      "Student potrafi analizować proste obwody elektryczne, projektować układy kombinacyjne i sekwencyjne, obsługiwać przyrządy pomiarowe (multimetr, oscyloskop) i montować układy na płytce prototypowej. [K_U08]",
      "Student potrafi zaplanować i przeprowadzić pomiary elektryczne, interpretować wyniki i weryfikować działanie projektowanego układu elektronicznego. [K_U09]"
    ],
    kompetencje_spoleczne: [
      "Student jest gotów do stosowania wiedzy elektrycznej i elektronicznej w projektowaniu systemów informatycznych z komponentami sprzętowymi. [K_K01]",
      "Student jest gotów do samodzielnego pogłębiania wiedzy z zakresu elektroniki i elektrotechniki jako podstawy dla inżynierii systemów wbudowanych. [K_K03]"
    ]
  },

  // ── FIZ ──────────────────────────────────────────────────────────────────────
  FIZ: {
    wiedza: [
      "Student ma rozszerzoną wiedzę z zakresu mechaniki klasycznej, termodynamiki, elektrostatyki i elektromagnetyzmu oraz optyki i akustyki, obejmującą dziedziny przydatne dla studiów na kierunku informatyka. [K_W02]",
      "Student zna i rozumie zasady tworzenia i weryfikacji modeli fizycznych oraz metody numeryczne przybliżonego rozwiązywania równań fizycznych. [K_W02]"
    ],
    umiejetnosci: [
      "Student potrafi analizować i wyjaśniać zjawiska fizyczne, budować i weryfikować modele matematyczne układów fizycznych oraz posługiwać się narzędziami symulacyjnymi. [K_U08]",
      "Student potrafi zaplanować i przeprowadzić eksperyment fizyczny (pomiar lub symulację), dobrać metody pomiarowe i sprzęt, opracować wyniki z uwzględnieniem błędu pomiarowego. [K_U09]"
    ],
    kompetencje_spoleczne: [
      "Student jest gotów do stosowania modelowania fizycznego i symulacji w rozwiązywaniu złożonych problemów inżynierskich z zakresu informatyki. [K_K01]",
      "Student jest gotów do samodzielnego uczenia się przez całe życie i poszerzania wiedzy fizycznej jako podstawy nowoczesnych technologii informatycznych. [K_K03]"
    ]
  },

  // ── TIN ──────────────────────────────────────────────────────────────────────
  TIN: {
    wiedza: [
      "Student zna i rozumie podstawowe pojęcia protokołów internetowych: HTTP/HTTPS, REST, WebSocket, DNS, OAuth 2.0, CORS, zasady bezpieczeństwa webowego (XSS, CSRF, SQL injection) i architektury aplikacji internetowych (SPA, SSR, PWA). [K_W09]",
      "Student zna i rozumie zaawansowane pojęcia z zakresu aplikacji internetowych: wzorce architektoniczne (MVC, MVP, MVVM, Clean Architecture), programowanie asynchroniczne (Promises, async/await) i nowoczesne frameworki frontend (React/Angular/Vue). [K_W21]"
    ],
    umiejetnosci: [
      "Student potrafi ocenić przydatność różnych technologii webowych i wybrać odpowiednie środowisko do realizacji aplikacji internetowej zgodnie ze specyfikacją. [K_U15]",
      "Student potrafi wytworzyć warstwową aplikację webową (frontend + backend + baza danych) z użyciem nowoczesnego stosu technologicznego, z uwzględnieniem bezpieczeństwa, wydajności i responsywności. [K_U24]",
      "Student potrafi zdiagnozować problem specyficzny dla aplikacji webowej i zaprojektować jego rozwiązanie z doborem odpowiednich narzędzi i technologii. [K_U28]"
    ],
    kompetencje_spoleczne: [
      "Student jest gotów do samodzielnego uczenia się nowych technologii webowych w dynamicznie zmieniającym się ekosystemie i regularnego aktualizowania swoich kompetencji. [K_K03]",
      "Student jest gotów do współpracy w zespole nad aplikacją webową, przyjmując różne role i korzystając z narzędzi zarządzania projektem i wersjami kodu. [K_K04]"
    ]
  },

  // ── PRG1 ─────────────────────────────────────────────────────────────────────
  PRG1: {
    wiedza: [
      "Student zna i rozumie podstawowe zasady programowania strukturalnego i obiektowego w języku C#: typy danych, instrukcje sterujące, metody, rekurencję, tablice, kolekcje generyczne i zarządzanie pamięcią w środowisku .NET. [K_W10]",
      "Student zna i rozumie podstawowe algorytmy wyszukiwania i sortowania danych oraz ich złożoność obliczeniową, a także wie, jak dobierać odpowiednie struktury danych. [K_W04]"
    ],
    umiejetnosci: [
      "Student potrafi czytać ze zrozumieniem programy w C#, samodzielnie pisać, kompilować, uruchamiać i debugować aplikacje konsolowe realizujące zadane wymagania. [K_U10]",
      "Student potrafi dobrać odpowiednie środowisko programistyczne (.NET/Visual Studio/Rider) i ocenić przydatność różnych konstrukcji języka C# do rozwiązania konkretnego zadania. [K_U15]"
    ],
    kompetencje_spoleczne: [
      "Student jest gotów do samodzielnego poszerzania kompetencji programistycznych w C# i .NET w oparciu o dokumentację techniczną i zasoby online. [K_K03]",
      "Student jest gotów do krytycznej oceny własnego kodu i przyjmowania feedbacku w celu poprawy jego jakości i czytelności. [K_K05]"
    ]
  },

  // ── POJ ──────────────────────────────────────────────────────────────────────
  POJ: {
    wiedza: [
      "Student zna i rozumie zaawansowane pojęcia programowania obiektowego w C#: klasy, interfejsy, dziedziczenie, polimorfizm, enkapsulacja, typy generyczne, kolekcje, delegaty i zdarzenia, obsługa wyjątków i serializacja. [K_W10]",
      "Student zna i rozumie wybrane wzorce projektowe (Creational, Structural, Behavioral) i rozumie ich zastosowanie w budowie rozszerzalnego, testowalnego kodu w .NET. [K_W10]"
    ],
    umiejetnosci: [
      "Student potrafi ocenić poprawność konstrukcji obiektowych i zaprojektować hierarchię klas, zastosować odpowiedni wzorzec projektowy i zaimplementować program obiektowy w C# spełniający specyfikację. [K_U15]",
      "Student potrafi wyspecyfikować, zaprojektować, zaimplementować, przetestować i zdebugować program obiektowy w C# z użyciem środowiska Visual Studio/Rider i platformy .NET. [K_U16]"
    ],
    kompetencje_spoleczne: [
      "Student jest gotów do samodzielnego uczenia się przez całe życie, systematycznie poszerzając wiedzę o nowych możliwościach platformy .NET i języka C#. [K_K03]",
      "Student jest gotów do krytycznej oceny jakości kodu obiektowego i stosowania dobrych praktyk (SOLID, Clean Code) w projektach programistycznych. [K_K05]"
    ]
  },

  // ── DOT ──────────────────────────────────────────────────────────────────────
  DOT: {
    wiedza: [
      "Student zna i rozumie zaawansowane paradygmaty programowania obiektowego w C#: właściwości i indeksatory, atrybuty i mechanizm refleksji, delegacje i zdarzenia, serializacja oraz zaawansowane techniki LINQ i async/await. [K_W10]",
      "Student zna i rozumie podstawy tworzenia serwisów webowych w technologii ASP.NET (Web API, middleware, DI) i rozumie architekturę nowoczesnych aplikacji backendowych .NET. [K_W10]"
    ],
    umiejetnosci: [
      "Student potrafi czytać ze zrozumieniem, pisać, weryfikować i uruchamiać zaawansowane programy w C#, oceniać przydatność paradygmatów i dobierać środowisko programistyczne. [K_U16]",
      "Student potrafi zaprojektować i wytworzyć zaawansowane oprogramowanie w C# zgodnie z paradygmatami OOP, przetestować je i zdebugować, planując etapy wytwarzania i dobierając narzędzia CI/CD. [K_U16]"
    ],
    kompetencje_spoleczne: [
      "Student jest gotów do ciągłego doskonalenia kompetencji programistycznych w ekosystemie .NET i C#. [K_K03]",
      "Student jest gotów do stosowania zaawansowanych technik programowania obiektowego w komercyjnych projektach programistycznych. [K_K04]"
    ]
  },

  // ── SCR ──────────────────────────────────────────────────────────────────────
  SCR: {
    wiedza: [
      "Student ma uporządkowaną wiedzę z zakresu architektur systemów komputerowych, systemów operacyjnych czasu rzeczywistego (RTOS) i zasad projektowania systemów czasu rzeczywistego z uwzględnieniem algorytmów szeregowania zadań i analizy WCET. [K_W07]",
      "Student ma podstawową wiedzę z zakresu programowania systemów mikroprocesorowych dla zastosowań SCR: interfejsy peryferyjne, obsługa przerwań, protokoły komunikacyjne i techniki optymalizacji kodu pod kątem deterministyczności czasowej. [K_W18]"
    ],
    umiejetnosci: [
      "Student potrafi skonstruować algorytm rozwiązania zadania SCR, zaimplementować go w wybranym środowisku programistycznym na dedykowanym hardware i przeprowadzić weryfikację poprawności i analizę czasową. [K_U23]",
      "Student potrafi dobrać parametry układów peryferyjnych i komunikacyjnych dla SCR, zintegrować je w system pomiarowo-sterujący i zaplanować symulację jego działania. [K_U23]"
    ],
    kompetencje_spoleczne: [
      "Student jest gotów do odpowiedzialnego projektowania systemów czasu rzeczywistego dla zastosowań krytycznych bezpieczeństwa (automatyka, robotyka, medycyna). [K_K06]",
      "Student jest gotów do samodzielnego poszerzania wiedzy o nowych architekturach i metodach projektowania systemów czasu rzeczywistego. [K_K03]"
    ]
  },

  // ── SKOA ─────────────────────────────────────────────────────────────────────
  SKOA: {
    wiedza: [
      "Student zna i rozumie podstawowe pojęcia z zakresu elektrotechniki, elektroniki i miernictwa oraz ich powiązania z informatyką w kontekście projektowania sieci komputerowych. [K_W03]",
      "Student zna i rozumie zagadnienia z zakresu techniki cyfrowej, architektury systemów komputerowych i sieci LAN/WAN: protokoły komunikacyjne (Ethernet, TCP/IP, IPv6), mechanizmy routingu i switchingu oraz zagadnienia bezpieczeństwa sieciowego. [K_W08]"
    ],
    umiejetnosci: [
      "Student potrafi zaprojektować, zainstalować i administrować siecią LAN z interfejsami WAN umożliwiającą realizację kluczowych usług sieciowych (DNS, DHCP, HTTP/HTTPS) z zachowaniem zasad bezpieczeństwa informacji. [K_U14]"
    ],
    kompetencje_spoleczne: [
      "Student jest gotów do uczenia się przez całe życie i inspirowania innych do pogłębiania wiedzy o sieciach komputerowych i bezpieczeństwie. [K_K03]",
      "Student jest gotów do myślenia i działania w sposób innowacyjny i przedsiębiorczy w obszarze infrastruktury sieciowej. [K_K07]",
      "Student jest gotów do efektywnej komunikacji z interesariuszami technicznymi i biznesowymi w zakresie projektowania i administrowania sieciami. [K_K08]"
    ]
  },

  // ── MLR ──────────────────────────────────────────────────────────────────────
  MLR: {
    wiedza: [
      "Student zna i rozumie podstawowe zastosowania wybranych algorytmów uczenia maszynowego (sieci neuronowe, SVM, drzewa decyzyjne, algorytmy ewolucyjne) w rozwiązywaniu rzeczywistych problemów inżynierskich. [K_W12]",
      "Student zna i rozumie znaczenie jakości i przygotowania danych w procesie uczenia maszynowego: czyszczenie danych, inżynieria cech, podziały train/val/test i techniki regularyzacji zapobiegające przeuczeniu. [K_W12]",
      "Student zna i rozumie zaawansowane metody przechowywania i strumieniowania danych dla uczenia maszynowego: bazy wektorowe, kolejki (Kafka), formaty danych (Parquet, HDF5). [K_W12]"
    ],
    umiejetnosci: [
      "Student potrafi wybrać odpowiedni algorytm ML do rozwiązania problemu biznesowego, poprawnie przygotować dane (pipeline), wytrenować model, dostroić hiperparametry i przeprowadzić analizę wyników. [K_U29]",
      "Student potrafi implementować i porównywać algorytmy uczenia maszynowego w Pythonie (scikit-learn, PyTorch/Keras) oraz oceniać ich skuteczność na zestawach danych rzeczywistych. [K_U29]"
    ],
    kompetencje_spoleczne: [
      "Student jest gotów do ciągłego podnoszenia kompetencji zawodowych w obszarze ML/AI, śledzenia literatury naukowej i wdrażania nowych metod. [K_K03]",
      "Student jest gotów do zastosowania uczenia maszynowego na rzecz rozwiązywania problemów społecznych i naukowych z uwzględnieniem etycznych aspektów AI. [K_K01]"
    ]
  }
};

// ── Zapis do plików ─────────────────────────────────────────────────────────────
const DIRS = [
  join(__dir, 'public/assets/syllabusy'),
  join(__dir, 'public/assets/syllabusy-n')
];

let totalUpdated = 0;
let totalSkipped = 0;

for (const dir of DIRS) {
  for (const [kod, noweEfekty] of Object.entries(NOWE_EFEKTY)) {
    const path = join(dir, `${kod}.json`);
    let raw;
    try {
      raw = readFileSync(path, 'utf8');
    } catch {
      continue; // plik nie istnieje w tym folderze
    }

    // Usuń BOM jeśli obecny
    if (raw.charCodeAt(0) === 0xFEFF) raw = raw.slice(1);

    let data;
    try {
      data = JSON.parse(raw);
    } catch (e) {
      process.stderr.write(`PARSE ERROR: ${path}: ${e.message}\n`);
      totalSkipped++;
      continue;
    }

    // Sprawdź strukturę
    if (data.sylabus && 'efekty_ksztalcenia' in data.sylabus) {
      data.sylabus.efekty_ksztalcenia = noweEfekty;
    } else if ('efekty_ksztalcenia' in data) {
      data.efekty_ksztalcenia = noweEfekty;
    } else {
      process.stderr.write(`SKIP (no efekty field): ${path}\n`);
      totalSkipped++;
      continue;
    }

    // Zapis bez BOM, ładne formatowanie 4 spacje
    writeFileSync(path, JSON.stringify(data, null, 4), 'utf8');
    process.stdout.write(`UPDATED: ${path}\n`);
    totalUpdated++;
  }
}

process.stdout.write(`\nGotowe: zaktualizowano ${totalUpdated} plikow, pominieto ${totalSkipped}.\n`);

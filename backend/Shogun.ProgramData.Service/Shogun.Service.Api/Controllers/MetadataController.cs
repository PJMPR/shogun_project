using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;

namespace Shogun.Service.Api.Controllers;

/// <summary>
/// Static reference data used by frontend form dropdowns.
/// Values are stored here as constants to avoid coupling to the filesystem.
/// </summary>
[ApiController]
[Route("api/v1/metadata")]
[Produces("application/json")]
[Authorize(Policy = "SyllabiAccess")]
public class MetadataController : ControllerBase
{
    private static readonly object StudyModes = new
    {
        tryb_studiow = new[]
        {
            "stacjonarny",
            "niestacjonarny",
        },
    };

    private static readonly object Faculty = new
    {
        elective_type = new[]
        {
            "Informatyka",
            "Sztuka Nowych Mediów"
        },

        profile = new[]
        {
            "ogólnoakademicki",
            "praktyczny",
        },
    };

    private static readonly object TeachingMethods = new
    {
        wyklad = new[]
        {
            "wykład",
            "wykład konwersatoryjny (z elementami dyskusji)",
            "wykład z prezentacją multimedialną",
            "wykład z prezentacją oprogramowania",
            "warsztaty",
        },
        cwiczenia_laboratorium = new[]
        {
            "analiza tekstów z dyskusją",
            "metoda projektów (projekt praktyczny)",
            "praca w grupach",
            "dyskusja",
            "rozwiązywanie zadań",
            "burza mózgów",
            "mind map",
            "puzzle learning",
            "studia przypadków z bazy studiów przypadków opracowanych przez firmy MŚP lub będące efektem staży",
            "praca grupowa nad projektem z wykorzystaniem nowoczesnych technik informatycznych",
            "warsztaty",
        },
    };

    private static readonly object VerificationMethods = new
    {
        metody_weryfikacji = new[]
        {
            "sprawdziany wstępne",
            "kolokwium",
            "kolokwium końcowe",
            "egzamin pisemny",
            "egzamin pisemny - test wyboru",
            "egzamin pisemny - tekst z lukami",
            "egzamin pisemny z zadaniami problemowymi",
            "egzamin pisemny ze studium przypadku",
            "egzamin ustny",
            "końcowe sprawozdanie z pracy w zespole",
            "prezentacja samodzielnej pracy semestralnej",
            "prezentacja elementu zespołowej pracy semestralnej",
            "prezentacja projektu i dokumentacji",
            "prezentacja mini-projektu",
            "obrona projektu",
            "rezultaty gry strategicznej",
            "ocena pracy podczas ćwiczenia",
            "raport z wykonanego zadania",
            "ocena sporządzonego dokumentu",
            "ocena sporządzonego oprogramowania",
            "wskazanie źródeł użytych materiałów",
            "kwestionariusz wywiadu",
            "sprawozdanie z rozmowy",
            "zapisanie na ścieżkę certyfikacyjną",
        },
    };

    private static readonly object LearningOutcomes = new
    {
        efekty_ksztalcenia = new
        {
            wiedza = new[]
            {
                new { kod_efektu = "K_W01", tresc = "ma rozszerzoną i pogłębioną wiedzę w zakresie matematyki, algebry, analizy matematycznej, geometrii liniowej, statystycznej analizy danych oraz matematyki dyskretnej w zakresie wymaganym dla realizacji złożonych zadań inżynierskich w dziedzinie informatyki" },
                new { kod_efektu = "K_W02", tresc = "ma rozszerzoną wiedzę z zakresu fizyki, obejmującą dziedziny przydatne dla studiów na kierunku informatyka, w tym elementy mechaniki klasycznej, podstawy elektryczności i magnetyzmu oraz optyki i akustyki" },
                new { kod_efektu = "K_W03", tresc = "ma uporządkowaną, podbudowaną teoretycznie wiedzę ogólną w zakresie elektrotechniki, elektroniki i miernictwa; rozumie powiązania informatyki z tymi obszarami" },
                new { kod_efektu = "K_W04", tresc = "zna i rozumie podstawowe pojęcia w zakresie konstrukcji programistycznych, rekurencji oraz struktur danych, jak też ich implementacji" },
                new { kod_efektu = "K_W05", tresc = "ma podstawową wiedzę z zakresu architektury komputerów i systemów operacyjnych" },
                new { kod_efektu = "K_W06", tresc = "ma podstawową wiedzę z zakresu sieci komputerowych i systemów rozproszonych" },
                new { kod_efektu = "K_W07", tresc = "ma szczegółową wiedzę z zakresu technologii programowania; zna zagadnienia związane z aplikacjami obiektowymi, komponentami, frameworkami, narzędziami i środowiskami programistycznymi" },
                new { kod_efektu = "K_W08", tresc = "ma wiedzę w zakresie projektowania, wytwarzania, testowania i utrzymania oprogramowania; zna metodyki i techniki inżynierii oprogramowania" },
                new { kod_efektu = "K_W09", tresc = "ma wiedzę w zakresie baz danych, systemów zarządzania bazami danych, hurtowni danych" },
                new { kod_efektu = "K_W10", tresc = "ma wiedzę w zakresie wybranych języków i technik programowania w obszarze wybranej specjalności" },
                new { kod_efektu = "K_W11", tresc = "zna i rozumie podstawowe pojęcia i zasady z zakresu ochrony własności przemysłowej i prawa autorskiego" },
                new { kod_efektu = "K_W12", tresc = "ma podstawową wiedzę z zakresu zarządzania, ekonomii i prawa niezbędną do rozumienia społecznych, ekonomicznych, prawnych i innych pozatechnicznych uwarunkowań działalności inżynierskiej" },
                new { kod_efektu = "K_W13", tresc = "zna ogólne zasady tworzenia i rozwoju form indywidualnej przedsiębiorczości" },
                new { kod_efektu = "K_W14", tresc = "zna i rozumie zaawansowane pojęcia z zakresu zagadnień inżynierii oprogramowania, standardów i kształtu cykli wytwórczych oraz ewolucji oprogramowania; zna podstawy zarządzania przedsięwzięciem programistycznym i rozumie problem jakości oprogramowania; rozumie rolę modelowania i ma szczegółową, podbudowaną teoretycznie wiedzę o obiektowym wytwarzaniu oprogramowania i notacji UML, zna i rozumie zasady korzystania z wzorców programowych i standardowych API; ma podsawową wiedzę o typowych narzędziach i środowiskach wspomagających;" },
                new { kod_efektu = "K_W15", tresc = "zna i rozumie podstawowe pojęcia z zakresu kluczowych zagadnień inżynierii wymagań, rozumie potrzebę systematycznego budowania i pielęgnacji specyfikacji wymagań; ma rozszerzoną wiedzę dotyczącą ich specyfikacji, analizy i modelowania z użyciem dostępnych narzędzi;" },
                new { kod_efektu = "K_W16", tresc = "ma rozszerzoną wiedzę z zakresu walidacji i testowania oprogramowania" },
                new { kod_efektu = "K_W17", tresc = "zna i rozumie podstawowe pojęcia z zakresu planowania przedsięwzięcia informatycznego, wstępnej oceny ekonomicznej, aspektów społecznych oraz analizy wykonalności" },
                new { kod_efektu = "K_W18", tresc = "zna i rozumie zaawansowane pojęcia z zakresu mikrokontrolerów i systemów wbudowanych oraz metodyk ich projektowania; rozumie powiązanie informatyki z problemami automatyki i robotyki oraz potrzebę przenoszenia ich dobrych praktyk na grunt informatyki" },
                new { kod_efektu = "K_W19", tresc = "zna i rozumie podstawowe problemy etyczne, społeczne i zawodowe informatyki, rozumie odpowiedzialność związaną z działalnością w obszarze informatyki; zna i rozumie podstawowe pojęcia z zakresu ochrony własności intelektualnej oraz prawa patentowego i autorskiego; zna i rozumie pozatechniczne aspekty informatyki, powiązanie przedsięwzięć informatycznych z ich otoczeniem i zagrożenia stąd płynące" },
                new { kod_efektu = "K_W20", tresc = "zna i rozumie podstawowe pojęcia dotyczące prowadzenia działalności gospodarczej, szczególnie przedsięwzięć informatycznych i rozumie rolę jej innowacyjności; zna i rozumie ogólne zasady tworzenia i rozwoju form indywidualnej przedsiębiorczości, szczególnie w zakresie zastosowań rozwiązań informatycznych" },
                new { kod_efektu = "K_W21", tresc = "zna i rozumie zaawansowane pojęcia w zakresie aplikacji internetowych, jej problemów, rozwiązań oraz stosowanych aktualnie narzędzi i technologii" },
                new { kod_efektu = "K_W22", tresc = "zna i rozumie zaawansowane pojęcia w zakresie sztucznej inteligencji, jej problemów, rozwiązań oraz stosowanych aktualnie narzędzi i technologii" },
                new { kod_efektu = "K_W23", tresc = "zna i rozumie zaawansowane pojęcia w zakresie cyberbezpieczeństwa, jej problemów, rozwiązań oraz stosowanych aktualnie narzędzi i technologii" },
                new { kod_efektu = "K_W24", tresc = "zna i rozumie zaawansowane pojęcia w zakresie inżynierii gier komputerowych, jej problemów, rozwiązań oraz stosowanych aktualnie narzędzi i technologii" },
                new { kod_efektu = "K_W25", tresc = "zna i rozumie zaawansowane pojęcia w zakresie grafiki komputerowej, jej problemów, rozwiązań oraz stosowanych aktualnie narzędzi i technologii" },
                new { kod_efektu = "K_W26", tresc = "zna i rozumie zaawansowane pojęcia w zakresie internetu rzeczy, jej problemów, rozwiązań oraz stosowanych aktualnie narzędzi i technologii" },
            },
            umiejetnosci = new[]
            {
                new { kod_efektu = "K_U01", tresc = "potrafi pozyskiwać informacje z literatury, baz danych oraz innych właściwie dobranych źródeł, dokonywać ich interpretacji i krytycznej oceny oraz wyciągać wnioski i formułować opinie" },
                new { kod_efektu = "K_U02", tresc = "potrafi porozumiewać się przy użyciu różnych technik w środowisku zawodowym oraz w innych środowiskach" },
                new { kod_efektu = "K_U03", tresc = "potrafi przygotować i przedstawić krótką prezentację poświęconą wynikom realizacji zadania inżynierskiego" },
                new { kod_efektu = "K_U04", tresc = "ma umiejętność samokształcenia się" },
                new { kod_efektu = "K_U05", tresc = "potrafi planować i przeprowadzać eksperymenty, w tym pomiary i symulacje komputerowe, interpretować uzyskane wyniki i wyciągać wnioski" },
                new { kod_efektu = "K_U06", tresc = "potrafi dobierać i stosować właściwe metody i narzędzia do rozwiązywania prostych zadań inżynierskich" },
                new { kod_efektu = "K_U07", tresc = "potrafi zaprojektować i wykonać dokumentację algorytmu lub programu; potrafi dobrać właściwe metody do implementacji danego algorytmu" },
                new { kod_efektu = "K_U08", tresc = "potrafi zaprojektować i wdrożyć system informatyczny z zastosowaniem wybranych narzędzi i technik wytwarzania oprogramowania" },
                new { kod_efektu = "K_U09", tresc = "potrafi dokonać krytycznej analizy sposobu funkcjonowania i ocenić istniejące rozwiązania techniczne w obszarze inżynierii oprogramowania" },
                new { kod_efektu = "K_U10", tresc = "potrafi identyfikować i formułować specyfikacje wymagań dla systemów informatycznych, uczestniczyć w pracach zespołów projektowych" },
                new { kod_efektu = "K_U11", tresc = "potrafi dokonać krytycznej analizy i oceny funkcjonowania baz danych i systemów zarządzania danymi" },
                new { kod_efektu = "K_U12", tresc = "potrafi projektować i implementować relacyjne i nierelacyjne bazy danych" },
                new { kod_efektu = "K_U13", tresc = "potrafi projektować sieci komputerowe i systemy wbudowane" },
                new { kod_efektu = "K_U14", tresc = "potrafi projektować i wdrażać systemy rozproszone i chmurowe" },
                new { kod_efektu = "K_U15", tresc = "potrafi stosować wybrane techniki i narzędzia do testowania oprogramowania" },
                new { kod_efektu = "K_U16", tresc = "potrafi tworzyć aplikacje z zastosowaniem technologii i języków programowania charakterystycznych dla wybranej specjalności" },
                new { kod_efektu = "K_U17", tresc = "potrafi posługiwać się językiem angielskim w zakresie informatyki i ma umiejętności językowe zgodne z wymaganiami B2" },
                new { kod_efektu = "K_U18", tresc = "potrafi sformułować zapytania w języku SQL i skonstruować schemat relacyjnej bazy danych na podstawie modelu ERD lub modelu klas; potrafi tworzyć transakcje w języku programowania i zarządzać bazą danych" },
                new { kod_efektu = "K_U19", tresc = "potrafi zaplanować i zrealizować prosty system oprogramowania zgodnie z metodyką obiektową, posługując się wzorcami programowymi, standardami i dobrymi praktykami programistycznymi; potrafi dobrać model procesu wytwarzania oprogramowania do specyfiki przedsięwzięcia, a także dobrać narzędzia wspomagające budowę oprogramowania" },
                new { kod_efektu = "K_U20", tresc = "potrafi zaplanować i przeprowadzić procesy pozyskiwania, analizy, specyfikacji i modelowania wymagań wobec oprogramowania oraz ich pielęgnacji" },
                new { kod_efektu = "K_U21", tresc = "potrafi dokonać przeglądu projektu oprogramowania i poprawić jego jakość" },
                new { kod_efektu = "K_U22", tresc = "potrafi zaplanować i przeprowadzić proces integracji, oceny i realizacji planu testowania oraz dokonać diagnozy defektów" },
                new { kod_efektu = "K_U23", tresc = "potrafi przeanalizować, zsyntezować i oprogramować prosty system wbudowany, z uwzględnieniem zasad bezpieczeństwa i niezawodności oraz sporządzić jego dokumentację" },
                new { kod_efektu = "K_U24", tresc = "potrafi wytworzyć warstwową aplikację webową w oparciu o wybrane wzorce architektoniczne i przy pomocy odpowiednio dobranych technologii" },
                new { kod_efektu = "K_U25", tresc = "potrafi uwzględnić społeczny, etyczny i prawny kontekst przedsięwzięcia informatycznego oraz ocenić związane z nim zagrożenia" },
                new { kod_efektu = "K_U26", tresc = "potrafi zaplanować i wytworzyć podstawowe dokumenty związane z realizacją prostego przedsięwzięcia informatycznego, wstępnie ocenić efekty ekonomiczne i społeczne przedsięwzięcia oraz ich wpływ na udziałowców;" },
                new { kod_efektu = "K_U27", tresc = "potrafi zaplanować i przeprowadzić proces instalacji i uruchomienia całości prostego systemu (system operacyjny, baza danych, aplikacja, oprogramowanie współdziałające)" },
                new { kod_efektu = "K_U28", tresc = "potrafi zdiagnozować problem specyficzny dla aplikacji internetowych, zaprojektować jego rozwiązanie, dobrać środki oraz określić i zrealizować kroki prowadzące do implementacji przyjętego rozwiązania." },
                new { kod_efektu = "K_U29", tresc = "potrafi zdiagnozować problem specyficzny dla sztucznej inteligencji, zaprojektować jego rozwiązanie, dobrać środki oraz określić i zrealizować kroki prowadzące do implementacji przyjętego rozwiązania." },
                new { kod_efektu = "K_U30", tresc = "potrafi zdiagnozować problem specyficzny dla cyberbezpieczeństwa, zaprojektować jego rozwiązanie, dobrać środki oraz określić i zrealizować kroki prowadzące do implementacji przyjętego rozwiązania." },
                new { kod_efektu = "K_U31", tresc = "potrafi zdiagnozować problem specyficzny dla inżynierii gier komputerowych, zaprojektować jego rozwiązanie, dobrać środki oraz określić i zrealizować kroki prowadzące do implementacji przyjętego rozwiązania." },
                new { kod_efektu = "K_U32", tresc = "potrafi zdiagnozować problem specyficzny dla grafiki komputerowej, zaprojektować jego rozwiązanie, dobrać środki oraz określić i zrealizować kroki prowadzące do implementacji przyjętego rozwiązania." },
                new { kod_efektu = "K_U33", tresc = "potrafi zdiagnozować problem specyficzny dla internetu rzeczy, zaprojektować jego rozwiązanie, dobrać środki oraz określić i zrealizować kroki prowadzące do implementacji przyjętego rozwiązania." },
            },
            kompetencje_spoleczne = new[]
            {
                new { kod_efektu = "K_K01", tresc = "rozumie potrzebę uczenia się przez całe życie; potrafi inspirować i organizować proces uczenia się innych osób" },
                new { kod_efektu = "K_K02", tresc = "potrafi współdziałać i pracować w grupie, przyjmując w niej różne role" },
                new { kod_efektu = "K_K03", tresc = "potrafi odpowiednio określić priorytety służące realizacji określonego przez siebie lub innych zadania" },
                new { kod_efektu = "K_K04", tresc = "prawidłowo identyfikuje i rozstrzyga dylematy związane z wykonywaniem zawodu" },
                new { kod_efektu = "K_K05", tresc = "potrafi myśleć i działać w sposób kreatywny i przedsiębiorczy" },
                new { kod_efektu = "K_K06", tresc = "ma świadomość ważności i rozumie pozatechniczne aspekty i skutki działalności inżynierskiej, w tym jej wpływu na środowisko i związanej z tym odpowiedzialności za podejmowane decyzje" },
                new { kod_efektu = "K_K07", tresc = "ma świadomość roli społecznej absolwenta uczelni technicznej, a zwłaszcza rozumie potrzebę formułowania i przekazywania społeczeństwu informacji i opinii dotyczących osiągnięć techniki i innych aspektów działalności inżynierskiej" },
                new { kod_efektu = "K_K08", tresc = "jest gotów do komunikacji w skuteczny sposób z inwestorami z różnych środowisk, pozyskując od nich wiedzę tworzącą wartość dodaną przedsięwzięć informatycznych" },
            },
        },
    };

    /// <summary>Returns available teaching methods for lecture and exercises/laboratory forms.</summary>
    [HttpGet("study-modes")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public IActionResult GetStudyModes() => Ok(StudyModes);

    /// <summary>Returns faculty-related metadata such as elective direction and study profile.</summary>
    [HttpGet("faculty")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public IActionResult GetFaculty() => Ok(Faculty);

    /// <summary>Returns available teaching methods for lecture and exercises/laboratory forms.</summary>
    [HttpGet("teaching-methods")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public IActionResult GetTeachingMethods() => Ok(TeachingMethods);

    /// <summary>Returns available assessment/verification methods for grading criteria.</summary>
    [HttpGet("verification-methods")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public IActionResult GetVerificationMethods() => Ok(VerificationMethods);

    /// <summary>Returns the full catalogue of learning outcomes (KEU codes) grouped by category.</summary>
    [HttpGet("learning-outcomes")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public IActionResult GetLearningOutcomes() => Ok(LearningOutcomes);
}

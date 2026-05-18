using Microsoft.AspNetCore.Mvc;

namespace Shogun.Service.Api.Controllers;

/// <summary>
/// Static reference data used by frontend form dropdowns.
/// Values are stored here as constants to avoid coupling to the filesystem.
/// </summary>
[ApiController]
[Route("api/v1/metadata")]
[Produces("application/json")]
public class MetadataController : ControllerBase
{
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
            },
        },
    };

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

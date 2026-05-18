using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using System.Text.Json.Serialization;

namespace Shogun.Service.Api.Domain.Entities;

/// <summary>
/// Strongly-typed representation of the nested `sylabus` document.
/// Properties use English PascalCase names; both BSON and JSON attributes
/// preserve the original snake_case field names used in the database and API.
/// </summary>
public class SyllabusContent
{
    [BsonExtraElements]
    [JsonIgnore]
    public BsonDocument? ExtraElements { get; set; }

    [BsonElement("uczelnia")]
    [JsonPropertyName("uczelnia")]
    public string? University { get; set; }

    [BsonElement("jednostka")]
    [JsonPropertyName("jednostka")]
    public string? Department { get; set; }

    [BsonElement("kierunek")]
    [JsonPropertyName("kierunek")]
    public string? FieldOfStudy { get; set; }

    [BsonElement("profil")]
    [JsonPropertyName("profil")]
    public string? Profile { get; set; }

    [BsonElement("tryb_studiow")]
    [JsonPropertyName("tryb_studiow")]
    public string? StudyMode { get; set; }

    [BsonElement("wersja_z_dnia")]
    [JsonPropertyName("wersja_z_dnia")]
    public string? VersionDate { get; set; }

    [BsonElement("nazwa_przedmiotu")]
    [JsonPropertyName("nazwa_przedmiotu")]
    public string? SubjectName { get; set; }

    [BsonElement("kod_przedmiotu")]
    [JsonPropertyName("kod_przedmiotu")]
    public string? SubjectCode { get; set; }

    [BsonElement("rok_studiow")]
    [JsonPropertyName("rok_studiow")]
    public int? StudyYear { get; set; }

    [BsonElement("semestr_studiow")]
    [JsonPropertyName("semestr_studiow")]
    public int? Semester { get; set; }

    [BsonElement("obligatoryjny")]
    [JsonPropertyName("obligatoryjny")]
    public bool? IsCompulsory { get; set; }

    [BsonElement("forma_i_liczba_godzin_zajec")]
    [JsonPropertyName("forma_i_liczba_godzin_zajec")]
    public ClassHoursForm? ClassHoursForm { get; set; }

    [BsonElement("odpowiedzialny_za_przedmiot")]
    [JsonPropertyName("odpowiedzialny_za_przedmiot")]
    public string? SubjectCoordinator { get; set; }

    [BsonElement("ects")]
    [JsonPropertyName("ects")]
    public int? Ects { get; set; }

    [BsonElement("godziny")]
    [JsonPropertyName("godziny")]
    public SyllabusHours? Hours { get; set; }

    [BsonElement("metody_dydaktyczne")]
    [JsonPropertyName("metody_dydaktyczne")]
    public TeachingMethods? TeachingMethods { get; set; }

    [BsonElement("zaliczenie")]
    [JsonPropertyName("zaliczenie")]
    public SyllabusAssessment? Assessment { get; set; }

    [BsonElement("kryteria_oceny")]
    [JsonPropertyName("kryteria_oceny")]
    public GradingCriteria? GradingCriteria { get; set; }

    [BsonElement("przedmioty_wprowadzajace")]
    [JsonPropertyName("przedmioty_wprowadzajace")]
    public List<PrerequisiteSubject>? PrerequisiteSubjects { get; set; }

    [BsonElement("cel_dydaktyczny")]
    [JsonPropertyName("cel_dydaktyczny")]
    public string? DidacticGoal { get; set; }

    [BsonElement("literatura")]
    [JsonPropertyName("literatura")]
    public Literature? Literature { get; set; }

    [BsonElement("efekty_ksztalcenia")]
    [JsonPropertyName("efekty_ksztalcenia")]
    public LearningOutcomes? LearningOutcomes { get; set; }

    [BsonElement("tresci_programowe")]
    [JsonPropertyName("tresci_programowe")]
    public List<ProgramContentItem>? ProgramContent { get; set; }

    [BsonElement("cel_dydaktyczny_eng")]
    [JsonPropertyName("cel_dydaktyczny_eng")]
    public string? DidacticGoalEng { get; set; }

    [BsonElement("informacje_dodatkowe")]
    [JsonPropertyName("informacje_dodatkowe")]
    public string? AdditionalInfo { get; set; }

    [BsonElement("rynek_pracy")]
    [JsonPropertyName("rynek_pracy")]
    public JobMarket? JobMarket { get; set; }

    [BsonElement("wymagania_laboratorium")]
    [JsonPropertyName("wymagania_laboratorium")]
    public LaboratoryRequirements? LaboratoryRequirements { get; set; }
}

public class ClassHoursForm
{
    [BsonExtraElements]
    [JsonIgnore]
    public BsonDocument? ExtraElements { get; set; }

    [BsonElement("wyklady")]
    [JsonPropertyName("wyklady")]
    public int? Lectures { get; set; }

    [BsonElement("cwiczenia_lektorat_seminarium")]
    [JsonPropertyName("cwiczenia_lektorat_seminarium")]
    public int? ExercisesLectorateSeminar { get; set; }

    [BsonElement("laboratorium_projekt")]
    [JsonPropertyName("laboratorium_projekt")]
    public int? LaboratoryProject { get; set; }
}

public class SyllabusHours
{
    [BsonExtraElements]
    [JsonIgnore]
    public BsonDocument? ExtraElements { get; set; }

    [BsonElement("z_udzialem_prowadzacego_h")]
    [JsonPropertyName("z_udzialem_prowadzacego_h")]
    public int? WithInstructorHours { get; set; }

    [BsonElement("praca_wlasna_studenta_h")]
    [JsonPropertyName("praca_wlasna_studenta_h")]
    public int? SelfStudyHours { get; set; }

    [BsonElement("calkowita_liczba_godzin_h")]
    [JsonPropertyName("calkowita_liczba_godzin_h")]
    public int? TotalHours { get; set; }

    [BsonElement("praca_wlasna_studenta")]
    [JsonPropertyName("praca_wlasna_studenta")]
    public string? SelfStudyDescription { get; set; }
}

public class TeachingMethods
{
    [BsonExtraElements]
    [JsonIgnore]
    public BsonDocument? ExtraElements { get; set; }

    [BsonElement("wyklad")]
    [JsonPropertyName("wyklad")]
    public List<string>? Lecture { get; set; }

    [BsonElement("cwiczenia_laboratorium")]
    [JsonPropertyName("cwiczenia_laboratorium")]
    public List<string>? ExercisesLaboratory { get; set; }
}

public class SyllabusAssessment
{
    [BsonExtraElements]
    [JsonIgnore]
    public BsonDocument? ExtraElements { get; set; }

    [BsonElement("Wykład")]
    [JsonPropertyName("Wykład")]
    public AssessmentMethod? Lecture { get; set; }

    [BsonElement("Ćwiczenia")]
    [JsonPropertyName("Ćwiczenia")]
    public AssessmentMethod? Exercises { get; set; }

    [BsonElement("Laboratorium")]
    [JsonPropertyName("Laboratorium")]
    public AssessmentMethod? Laboratory { get; set; }
}

public class AssessmentMethod
{
    [BsonExtraElements]
    [JsonIgnore]
    public BsonDocument? ExtraElements { get; set; }

    [BsonElement("sposob")]
    [JsonPropertyName("sposob")]
    public string? Method { get; set; }
}

public class GradingCriteria
{
    [BsonExtraElements]
    [JsonIgnore]
    public BsonDocument? ExtraElements { get; set; }

    [BsonElement("wyklad")]
    [JsonPropertyName("wyklad")]
    public List<string>? Lecture { get; set; }

    [BsonElement("cwiczenia_laboratorium")]
    [JsonPropertyName("cwiczenia_laboratorium")]
    public List<string>? ExercisesLaboratory { get; set; }
}

public class PrerequisiteSubject
{
    [BsonExtraElements]
    [JsonIgnore]
    public BsonDocument? ExtraElements { get; set; }

    [BsonElement("nazwa")]
    [JsonPropertyName("nazwa")]
    public string? Name { get; set; }

    [BsonElement("wymagania")]
    [JsonPropertyName("wymagania")]
    public string? Requirements { get; set; }
}

public class Literature
{
    [BsonExtraElements]
    [JsonIgnore]
    public BsonDocument? ExtraElements { get; set; }

    [BsonElement("podstawowa")]
    [JsonPropertyName("podstawowa")]
    public LiteratureSection? Basic { get; set; }

    [BsonElement("uzupelniajaca")]
    [JsonPropertyName("uzupelniajaca")]
    public LiteratureSection? Supplementary { get; set; }

    [BsonElement("dokumentacja_internetowa")]
    [JsonPropertyName("dokumentacja_internetowa")]
    public Dictionary<string, string>? InternetDocumentation { get; set; }
}

public class LiteratureSection
{
    [BsonExtraElements]
    [JsonIgnore]
    public BsonDocument? ExtraElements { get; set; }

    [BsonElement("pozycje")]
    [JsonPropertyName("pozycje")]
    public List<string>? Items { get; set; }
}

public class LearningOutcomes
{
    [BsonExtraElements]
    [JsonIgnore]
    public BsonDocument? ExtraElements { get; set; }

    [BsonElement("wiedza")]
    [JsonPropertyName("wiedza")]
    public List<LearningOutcomeItem>? Knowledge { get; set; }

    [BsonElement("umiejetnosci")]
    [JsonPropertyName("umiejetnosci")]
    public List<LearningOutcomeItem>? Skills { get; set; }

    [BsonElement("kompetencje_spoleczne")]
    [JsonPropertyName("kompetencje_spoleczne")]
    public List<LearningOutcomeItem>? SocialCompetences { get; set; }
}

public class LearningOutcomeItem
{
    [BsonExtraElements]
    [JsonIgnore]
    public BsonDocument? ExtraElements { get; set; }

    [BsonElement("keu")]
    [JsonPropertyName("keu")]
    public string? Keu { get; set; }

    [BsonElement("peu")]
    [JsonPropertyName("peu")]
    public string? Description { get; set; }

    [BsonElement("metoda_weryfikacji")]
    [JsonPropertyName("metoda_weryfikacji")]
    public string? VerificationMethod { get; set; }
}

public class ProgramContentItem
{
    [BsonExtraElements]
    [JsonIgnore]
    public BsonDocument? ExtraElements { get; set; }

    [BsonElement("nr_zajec")]
    [JsonPropertyName("nr_zajec")]
    public int? ClassNumber { get; set; }

    [BsonElement("wyklad")]
    [JsonPropertyName("wyklad")]
    public string? Lecture { get; set; }

    [BsonElement("cwiczenia")]
    [JsonPropertyName("cwiczenia")]
    public string? Exercises { get; set; }
}

public class JobMarket
{
    [BsonExtraElements]
    [JsonIgnore]
    public BsonDocument? ExtraElements { get; set; }

    [BsonElement("dziedzina_gospodarki")]
    [JsonPropertyName("dziedzina_gospodarki")]
    public string? EconomyField { get; set; }

    [BsonElement("zawody")]
    [JsonPropertyName("zawody")]
    public string? Professions { get; set; }

    [BsonElement("prace_dyplomowe")]
    [JsonPropertyName("prace_dyplomowe")]
    public List<string>? DiplomaTheses { get; set; }
}

public class LaboratoryRequirements
{
    [BsonExtraElements]
    [JsonIgnore]
    public BsonDocument? ExtraElements { get; set; }

    [BsonElement("pc_params")]
    [JsonPropertyName("pc_params")]
    public List<string>? PcParams { get; set; }

    [BsonElement("software")]
    [JsonPropertyName("software")]
    public List<string>? Software { get; set; }

    [BsonElement("wyposazenie_dodatkowe")]
    [JsonPropertyName("wyposazenie_dodatkowe")]
    public List<string>? AdditionalEquipment { get; set; }
}

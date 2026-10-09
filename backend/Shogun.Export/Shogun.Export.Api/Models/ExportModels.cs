using System.Text.Json.Serialization;
using Shogun.Schedule.Application;
using Shogun.Schedule.Domain;

namespace Shogun.Export.Api.Models;

public sealed record ExportQuery(string AcademicYear, string FacultyCode, StudyMode StudyMode);
public sealed record ExportSyllabus(
    [property: JsonPropertyName("kod_przedmiotu")] string SubjectCode,
    [property: JsonPropertyName("tryb_studiow")] string StudyMode,
    [property: JsonPropertyName("_source")] string? Source,
    [property: JsonPropertyName("sylabus")] ExportSyllabusContent? Content);
public sealed record ExportSyllabusContent(
    [property: JsonPropertyName("kierunek")] string? FieldOfStudy,
    [property: JsonPropertyName("profil")] string? Profile,
    [property: JsonPropertyName("tryb_studiow")] string? StudyMode,
    [property: JsonPropertyName("semestr_studiow")] int? Semester,
    [property: JsonPropertyName("ects")] int? Ects,
    [property: JsonPropertyName("forma_i_liczba_godzin_zajec")] ExportClassHours? ClassHoursForm);
public sealed record ExportClassHours(
    [property: JsonPropertyName("wyklady")] int? Lectures,
    [property: JsonPropertyName("cwiczenia_lektorat_seminarium")] int? ExercisesLectorateSeminar,
    [property: JsonPropertyName("laboratorium_projekt")] int? LaboratoryProject);

public sealed record ExportData(FacultyWorkloadDto Workload, IReadOnlyList<ExportSyllabus> Syllabi);

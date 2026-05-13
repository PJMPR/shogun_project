using Shogun.Service.Api.Domain.Entities;
using System.Text.Json.Nodes;
using System.Text.Json.Serialization;

namespace Shogun.Service.Api.Application.DTOs;

// ─── Syllabus ────────────────────────────────────────────────────────────────

public record SyllabusDto(
    [property: JsonPropertyName("id")] string Id,
    [property: JsonPropertyName("kod_przedmiotu")] string SubjectCode,
    [property: JsonPropertyName("tryb_studiow")] string StudyMode,
    [property: JsonPropertyName("is_stary")] bool IsLegacy,
    [property: JsonPropertyName("_source")] string? Source,
    [property: JsonPropertyName("sylabus")] SyllabusContent? Content);

public record CreateSyllabusRequest(
    [property: JsonPropertyName("kod_przedmiotu")] string SubjectCode,
    [property: JsonPropertyName("tryb_studiow")] string StudyMode,
    [property: JsonPropertyName("is_stary")] bool IsLegacy,
    [property: JsonPropertyName("_source")] string? Source,
    [property: JsonPropertyName("sylabus")] SyllabusContent? Content);

public record UpdateSyllabusRequest(
    [property: JsonPropertyName("kod_przedmiotu")] string SubjectCode,
    [property: JsonPropertyName("tryb_studiow")] string StudyMode,
    [property: JsonPropertyName("is_stary")] bool IsLegacy,
    [property: JsonPropertyName("_source")] string? Source,
    [property: JsonPropertyName("sylabus")] SyllabusContent? Content);

// ─── Program ─────────────────────────────────────────────────────────────────

public record ProgramDto(
    string id,
    string tryb_studiow,
    bool is_stary,
    string lang,
    string? _source,
    JsonObject? data);

public record CreateProgramRequest(
    string tryb_studiow,
    bool is_stary,
    string lang,
    string? _source,
    JsonObject? data);

public record UpdateProgramRequest(
    string tryb_studiow,
    bool is_stary,
    string lang,
    string? _source,
    JsonObject? data);

// ─── Elective ────────────────────────────────────────────────────────────────

public record ElectiveDto(
    string id,
    string elective_type,
    string tryb_studiow,
    bool is_stary,
    string lang,
    string? _source,
    JsonObject? data);

public record CreateElectiveRequest(
    string elective_type,
    string tryb_studiow,
    bool is_stary,
    string lang,
    string? _source,
    JsonObject? data);

public record UpdateElectiveRequest(
    string elective_type,
    string tryb_studiow,
    bool is_stary,
    string lang,
    string? _source,
    JsonObject? data);

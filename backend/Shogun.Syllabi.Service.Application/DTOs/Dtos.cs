using MongoDB.Bson;
using System.Text.Json.Nodes;

namespace Shogun.Syllabi.Service.Application.DTOs;

// ─── Syllabus ────────────────────────────────────────────────────────────────

public record SyllabusDto(
    string id,
    string kod_przedmiotu,
    string tryb_studiow,
    bool is_stary,
    string? _source,
    JsonObject? sylabus);

public record CreateSyllabusRequest(
    string kod_przedmiotu,
    string tryb_studiow,
    bool is_stary,
    string? _source,
    JsonObject? sylabus);

public record UpdateSyllabusRequest(
    string kod_przedmiotu,
    string tryb_studiow,
    bool is_stary,
    string? _source,
    JsonObject? sylabus);

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

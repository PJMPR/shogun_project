using System.Security.Claims;
using Shogun.Assignments.Service.Api.Application.DTOs;
using Shogun.Assignments.Service.Api.Domain.Entities;
using Shogun.Assignments.Service.Api.Domain.Repositories;

namespace Shogun.Assignments.Service.Api.Application.Services;

public class AssignmentService(ILecturerAssignmentRepository repository) : IAssignmentService
{
    public async Task<AssignmentResponseDto> CreateAsync(CreateAssignmentDto dto, ClaimsPrincipal user, CancellationToken ct = default)
    {
        var entity = new LecturerAssignment
        {
            LecturerFirstName = GetFirstName(user),
            LecturerLastName  = GetLastName(user),
            LecturerUserId    = GetUserId(user),
            LecturerEmail     = GetEmail(user),
            SemesterType      = dto.SemesterType,
            AcademicYear      = dto.AcademicYear,
            Notes             = dto.Notes,
            SubmittedAt       = DateTime.UtcNow,
            Subjects = dto.Subjects.Select(s => new AssignmentSubject
            {
                SubjectMongoId = s.MongoId,
                SubjectName    = s.Name,
                SubjectCode    = s.Code,
                TrybStudiow   = s.TrybStudiow,
                Semester       = s.Semester,
                HasWyklad      = s.HasWyklad,
                HasCwiczenia   = s.HasCwiczenia,
                HasLab         = s.HasLab,
            }).ToList(),
            Availability = dto.Availability.Select(a => new AssignmentAvailability
            {
                Day      = a.Day,
                FromTime = a.From,
                ToTime   = a.To,
            }).ToList(),
        };

        var created = await repository.CreateAsync(entity, ct);
        return MapToDto(created);
    }

    public async Task<AssignmentResponseDto?> GetByIdAsync(int id, CancellationToken ct = default)
    {
        var entity = await repository.GetByIdAsync(id, ct);
        return entity is null ? null : MapToDto(entity);
    }

    public async Task<IReadOnlyList<AssignmentResponseDto>> GetAllAsync(CancellationToken ct = default)
    {
        var entities = await repository.GetAllAsync(ct);
        return entities.Select(MapToDto).ToList();
    }

    public async Task<IReadOnlyList<AssignmentResponseDto>> GetMyAsync(ClaimsPrincipal user, CancellationToken ct = default)
    {
        var userId = GetUserId(user);
        var entities = await repository.GetByUserIdAsync(userId, GetEmail(user), ct);
        return entities.Select(MapToDto).ToList();
    }

    public async Task<IReadOnlyList<AssignmentResponseDto>> GetLatestPerLecturerAsync(CancellationToken ct = default)
    {
        var entities = await repository.GetLatestPerLecturerAsync(ct);
        return entities.Select(MapToDto).ToList();
    }

    private static string GetUserId(ClaimsPrincipal user) =>
        user.FindFirst("sub")?.Value
        ?? user.FindFirst(ClaimTypes.NameIdentifier)?.Value
        ?? throw new UnauthorizedAccessException("Subject claim not found in token.");

    private static string? GetEmail(ClaimsPrincipal user) =>
        user.FindFirst(ClaimTypes.Email)?.Value
        ?? user.FindFirst("email")?.Value;

    private static string GetFirstName(ClaimsPrincipal user) =>
        user.FindFirst(ClaimTypes.GivenName)?.Value
        ?? user.FindFirst("given_name")?.Value
        ?? user.FindFirst("firstName")?.Value
        ?? string.Empty;

    private static string GetLastName(ClaimsPrincipal user) =>
        user.FindFirst(ClaimTypes.Surname)?.Value
        ?? user.FindFirst("family_name")?.Value
        ?? user.FindFirst("lastName")?.Value
        ?? string.Empty;

    private static AssignmentResponseDto MapToDto(LecturerAssignment e) => new()
    {
        Id                = e.Id,
        LecturerFirstName = e.LecturerFirstName,
        LecturerLastName  = e.LecturerLastName,
        LecturerUserId    = e.LecturerUserId,
        LecturerEmail     = e.LecturerEmail,
        SemesterType      = e.SemesterType,
        AcademicYear      = e.AcademicYear,
        Notes             = e.Notes,
        SubmittedAt       = e.SubmittedAt,
        Subjects = e.Subjects.Select(s => new AssignmentSubjectDto
        {
            Id           = s.Id,
            MongoId      = s.SubjectMongoId,
            Name         = s.SubjectName,
            Code         = s.SubjectCode,
            TrybStudiow  = s.TrybStudiow,
            Semester     = s.Semester,
            HasWyklad    = s.HasWyklad,
            HasCwiczenia = s.HasCwiczenia,
            HasLab       = s.HasLab,
        }).ToList(),
        Availability = e.Availability.Select(a => new AssignmentAvailabilityDto
        {
            Id   = a.Id,
            Day  = a.Day,
            From = a.FromTime,
            To   = a.ToTime,
        }).ToList(),
    };
}


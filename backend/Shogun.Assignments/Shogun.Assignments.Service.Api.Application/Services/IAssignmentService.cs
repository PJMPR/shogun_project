using Shogun.Assignments.Service.Api.Application.DTOs;

namespace Shogun.Assignments.Service.Api.Application.Services;

public interface IAssignmentService
{
    Task<AssignmentResponseDto> CreateAsync(CreateAssignmentDto dto, System.Security.Claims.ClaimsPrincipal user, CancellationToken ct = default);
    Task<AssignmentResponseDto?> GetByIdAsync(int id, CancellationToken ct = default);
    Task<IReadOnlyList<AssignmentResponseDto>> GetAllAsync(CancellationToken ct = default);
    Task<IReadOnlyList<AssignmentResponseDto>> GetMyAsync(System.Security.Claims.ClaimsPrincipal user, CancellationToken ct = default);
    Task<IReadOnlyList<AssignmentResponseDto>> GetLatestPerLecturerAsync(CancellationToken ct = default);
}

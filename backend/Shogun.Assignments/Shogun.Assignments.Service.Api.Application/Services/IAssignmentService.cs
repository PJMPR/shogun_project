using Shogun.Assignments.Service.Api.Application.DTOs;

namespace Shogun.Assignments.Service.Api.Application.Services;

public interface IAssignmentService
{
    Task<AssignmentResponseDto> CreateAsync(CreateAssignmentDto dto, CancellationToken ct = default);
    Task<AssignmentResponseDto?> GetByIdAsync(int id, CancellationToken ct = default);
    Task<IReadOnlyList<AssignmentResponseDto>> GetAllAsync(CancellationToken ct = default);
}

using Shogun.Assignments.Service.Api.Domain.Entities;

namespace Shogun.Assignments.Service.Api.Domain.Repositories;

public interface ILecturerAssignmentRepository
{
    Task<LecturerAssignment> CreateAsync(LecturerAssignment assignment, CancellationToken ct = default);
    Task<LecturerAssignment?> GetByIdAsync(int id, CancellationToken ct = default);
    Task<IReadOnlyList<LecturerAssignment>> GetAllAsync(CancellationToken ct = default);
}

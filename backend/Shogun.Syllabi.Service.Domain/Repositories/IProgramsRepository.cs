using Shogun.Syllabi.Service.Domain.Entities;

namespace Shogun.Syllabi.Service.Domain.Repositories;

public record ProgramsListQuery(
    int Page = 1,
    int PageSize = 20,
    string? SortBy = null,
    string SortDir = "asc",
    string? Search = null,
    string? tryb_studiow = null,
    bool? is_stary = null,
    string? lang = null);

public interface IProgramsRepository
{
    Task<PagedResult<Program>> ListAsync(ProgramsListQuery query, CancellationToken ct = default);
    Task<Program?> GetByIdAsync(string id, CancellationToken ct = default);
    Task<Program> CreateAsync(Program entity, CancellationToken ct = default);
    Task<Program?> UpdateAsync(string id, Program entity, CancellationToken ct = default);
    Task<bool> DeleteAsync(string id, CancellationToken ct = default);
}

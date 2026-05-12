using Shogun.Syllabi.Service.Domain.Entities;

namespace Shogun.Syllabi.Service.Domain.Repositories;

public record ElectivesListQuery(
    int Page = 1,
    int PageSize = 20,
    string? SortBy = null,
    string SortDir = "asc",
    string? Search = null,
    string? elective_type = null,
    string? tryb_studiow = null,
    bool? is_stary = null,
    string? lang = null);

public interface IElectivesRepository
{
    Task<PagedResult<Elective>> ListAsync(ElectivesListQuery query, CancellationToken ct = default);
    Task<Elective?> GetByIdAsync(string id, CancellationToken ct = default);
    Task<Elective> CreateAsync(Elective entity, CancellationToken ct = default);
    Task<Elective?> UpdateAsync(string id, Elective entity, CancellationToken ct = default);
    Task<bool> DeleteAsync(string id, CancellationToken ct = default);
}

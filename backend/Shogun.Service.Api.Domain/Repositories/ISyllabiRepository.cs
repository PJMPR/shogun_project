using Shogun.Service.Api.Domain.Entities;

namespace Shogun.Service.Api.Domain.Repositories;

public record SyllabiListQuery(
    int Page = 1,
    int PageSize = 20,
    string? SortBy = null,
    string SortDir = "asc",
    string? Search = null,
    string? SubjectCode = null,
    string? StudyMode = null,
    bool? IsLegacy = null);

public interface ISyllabiRepository
{
    Task<PagedResult<Syllabus>> ListAsync(SyllabiListQuery query, CancellationToken ct = default);
    Task<Syllabus?> GetByIdAsync(string id, CancellationToken ct = default);
    Task<Syllabus> CreateAsync(Syllabus entity, CancellationToken ct = default);
    Task<Syllabus?> UpdateAsync(string id, Syllabus entity, CancellationToken ct = default);
    Task<bool> DeleteAsync(string id, CancellationToken ct = default);
}

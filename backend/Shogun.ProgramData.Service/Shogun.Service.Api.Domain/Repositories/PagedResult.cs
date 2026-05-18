namespace Shogun.Service.Api.Domain.Repositories;

/// <summary>Generic paged result.</summary>
public record PagedResult<T>(IReadOnlyList<T> Items, long TotalCount, int Page, int PageSize);

/// <summary>Common list query parameters.</summary>
public record ListQuery(
    int Page = 1,
    int PageSize = 20,
    string? SortBy = null,
    string SortDir = "asc",
    string? Search = null);

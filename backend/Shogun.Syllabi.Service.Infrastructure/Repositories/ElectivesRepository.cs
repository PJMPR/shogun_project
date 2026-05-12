using MongoDB.Bson;
using MongoDB.Driver;
using Shogun.Syllabi.Service.Domain.Entities;
using Shogun.Syllabi.Service.Domain.Repositories;
using Shogun.Syllabi.Service.Infrastructure.Persistence;

namespace Shogun.Syllabi.Service.Infrastructure.Repositories;

public class ElectivesRepository : IElectivesRepository
{
    private readonly IMongoCollection<Elective> _col;

    public ElectivesRepository(MongoDbContext ctx) => _col = ctx.Electives;

    public async Task<PagedResult<Elective>> ListAsync(ElectivesListQuery q, CancellationToken ct = default)
    {
        var filter = BuildFilter(q);
        var sort = BuildSort(q.SortBy, q.SortDir);

        var totalCount = await _col.CountDocumentsAsync(filter, cancellationToken: ct);
        var items = await _col.Find(filter)
            .Sort(sort)
            .Skip((q.Page - 1) * q.PageSize)
            .Limit(q.PageSize)
            .ToListAsync(ct);

        return new PagedResult<Elective>(items, totalCount, q.Page, q.PageSize);
    }

    public Task<Elective?> GetByIdAsync(string id, CancellationToken ct = default)
        => _col.Find(x => x.Id == id).FirstOrDefaultAsync(ct)!;

    public async Task<Elective> CreateAsync(Elective entity, CancellationToken ct = default)
    {
        await _col.InsertOneAsync(entity, cancellationToken: ct);
        return entity;
    }

    public async Task<Elective?> UpdateAsync(string id, Elective entity, CancellationToken ct = default)
    {
        entity.Id = id;
        var result = await _col.ReplaceOneAsync(x => x.Id == id, entity, cancellationToken: ct);
        return result.MatchedCount > 0 ? entity : null;
    }

    public async Task<bool> DeleteAsync(string id, CancellationToken ct = default)
    {
        var result = await _col.DeleteOneAsync(x => x.Id == id, ct);
        return result.DeletedCount > 0;
    }

    private static FilterDefinition<Elective> BuildFilter(ElectivesListQuery q)
    {
        var builder = Builders<Elective>.Filter;
        var filters = new List<FilterDefinition<Elective>>();

        if (!string.IsNullOrWhiteSpace(q.elective_type))
            filters.Add(builder.Eq(x => x.elective_type, q.elective_type));

        if (!string.IsNullOrWhiteSpace(q.tryb_studiow))
            filters.Add(builder.Eq(x => x.tryb_studiow, q.tryb_studiow));

        if (q.is_stary.HasValue)
            filters.Add(builder.Eq(x => x.is_stary, q.is_stary.Value));

        if (!string.IsNullOrWhiteSpace(q.lang))
            filters.Add(builder.Eq(x => x.lang, q.lang));

        if (!string.IsNullOrWhiteSpace(q.Search))
        {
            var regex = new BsonRegularExpression(q.Search, "i");
            filters.Add(builder.Or(
                builder.Regex(x => x.elective_type, regex),
                builder.Regex(x => x.tryb_studiow, regex),
                builder.Regex("groups.items.name", regex),
                builder.Regex("specializations.name", regex)
            ));
        }

        return filters.Count > 0 ? builder.And(filters) : builder.Empty;
    }

    private static SortDefinition<Elective> BuildSort(string? sortBy, string sortDir)
    {
        var builder = Builders<Elective>.Sort;
        var field = sortBy ?? "elective_type";
        return sortDir.ToLowerInvariant() == "desc"
            ? builder.Descending(field)
            : builder.Ascending(field);
    }
}

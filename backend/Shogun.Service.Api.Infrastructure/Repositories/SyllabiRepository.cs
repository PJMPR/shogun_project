using MongoDB.Bson;
using MongoDB.Driver;
using Shogun.Service.Api.Domain.Entities;
using Shogun.Service.Api.Domain.Repositories;
using Shogun.Service.Api.Infrastructure.Persistence;

namespace Shogun.Service.Api.Infrastructure.Repositories;

public class SyllabiRepository : ISyllabiRepository
{
    private readonly IMongoCollection<Syllabus> _col;

    public SyllabiRepository(MongoDbContext ctx) => _col = ctx.Syllabi;

    public async Task<PagedResult<Syllabus>> ListAsync(SyllabiListQuery q, CancellationToken ct = default)
    {
        var filter = BuildFilter(q);
        var sort = BuildSort(q.SortBy, q.SortDir);

        var totalCount = await _col.CountDocumentsAsync(filter, cancellationToken: ct);
        var items = await _col.Find(filter)
            .Sort(sort)
            .Skip((q.Page - 1) * q.PageSize)
            .Limit(q.PageSize)
            .ToListAsync(ct);

        return new PagedResult<Syllabus>(items, totalCount, q.Page, q.PageSize);
    }

    public Task<Syllabus?> GetByIdAsync(string id, CancellationToken ct = default)
        => _col.Find(x => x.Id == id).FirstOrDefaultAsync(ct)!;

    public async Task<Syllabus> CreateAsync(Syllabus entity, CancellationToken ct = default)
    {
        await _col.InsertOneAsync(entity, cancellationToken: ct);
        return entity;
    }

    public async Task<Syllabus?> UpdateAsync(string id, Syllabus entity, CancellationToken ct = default)
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

    private static FilterDefinition<Syllabus> BuildFilter(SyllabiListQuery q)
    {
        var builder = Builders<Syllabus>.Filter;
        var filters = new List<FilterDefinition<Syllabus>>();

        if (!string.IsNullOrWhiteSpace(q.kod_przedmiotu))
            filters.Add(builder.Regex(x => x.kod_przedmiotu, new BsonRegularExpression(q.kod_przedmiotu, "i")));

        if (!string.IsNullOrWhiteSpace(q.tryb_studiow))
            filters.Add(builder.Eq(x => x.tryb_studiow, q.tryb_studiow));

        if (q.is_stary.HasValue)
            filters.Add(builder.Eq(x => x.is_stary, q.is_stary.Value));

        if (!string.IsNullOrWhiteSpace(q.Search))
        {
            var regex = new BsonRegularExpression(q.Search, "i");
            filters.Add(builder.Or(
                builder.Regex(x => x.kod_przedmiotu, regex),
                builder.Regex("sylabus.nazwa_przedmiotu", regex),
                builder.Regex("sylabus.odpowiedzialny_za_przedmiot", regex)
            ));
        }

        return filters.Count > 0 ? builder.And(filters) : builder.Empty;
    }

    private static SortDefinition<Syllabus> BuildSort(string? sortBy, string sortDir)
    {
        var builder = Builders<Syllabus>.Sort;
        var field = sortBy ?? "kod_przedmiotu";
        return sortDir.ToLowerInvariant() == "desc"
            ? builder.Descending(field)
            : builder.Ascending(field);
    }
}

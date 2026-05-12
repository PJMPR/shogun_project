using MongoDB.Bson;
using MongoDB.Driver;
using Shogun.Syllabi.Service.Domain.Entities;
using Shogun.Syllabi.Service.Domain.Repositories;
using Shogun.Syllabi.Service.Infrastructure.Persistence;

namespace Shogun.Syllabi.Service.Infrastructure.Repositories;

public class ProgramsRepository : IProgramsRepository
{
    private readonly IMongoCollection<Domain.Entities.Program> _col;

    public ProgramsRepository(MongoDbContext ctx) => _col = ctx.Programs;

    public async Task<PagedResult<Domain.Entities.Program>> ListAsync(ProgramsListQuery q, CancellationToken ct = default)
    {
        var filter = BuildFilter(q);
        var sort = BuildSort(q.SortBy, q.SortDir);

        var totalCount = await _col.CountDocumentsAsync(filter, cancellationToken: ct);
        var items = await _col.Find(filter)
            .Sort(sort)
            .Skip((q.Page - 1) * q.PageSize)
            .Limit(q.PageSize)
            .ToListAsync(ct);

        return new PagedResult<Domain.Entities.Program>(items, totalCount, q.Page, q.PageSize);
    }

    public Task<Domain.Entities.Program?> GetByIdAsync(string id, CancellationToken ct = default)
        => _col.Find(x => x.Id == id).FirstOrDefaultAsync(ct)!;

    public async Task<Domain.Entities.Program> CreateAsync(Domain.Entities.Program entity, CancellationToken ct = default)
    {
        await _col.InsertOneAsync(entity, cancellationToken: ct);
        return entity;
    }

    public async Task<Domain.Entities.Program?> UpdateAsync(string id, Domain.Entities.Program entity, CancellationToken ct = default)
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

    private static FilterDefinition<Domain.Entities.Program> BuildFilter(ProgramsListQuery q)
    {
        var builder = Builders<Domain.Entities.Program>.Filter;
        var filters = new List<FilterDefinition<Domain.Entities.Program>>();

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
                builder.Regex(x => x.tryb_studiow, regex),
                builder.Regex(x => x.lang, regex)
            ));
        }

        return filters.Count > 0 ? builder.And(filters) : builder.Empty;
    }

    private static SortDefinition<Domain.Entities.Program> BuildSort(string? sortBy, string sortDir)
    {
        var builder = Builders<Domain.Entities.Program>.Sort;
        var field = sortBy ?? "tryb_studiow";
        return sortDir.ToLowerInvariant() == "desc"
            ? builder.Descending(field)
            : builder.Ascending(field);
    }
}

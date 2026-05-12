using Shogun.Syllabi.Service.Application.DTOs;
using Shogun.Syllabi.Service.Application.Mapping;
using Shogun.Syllabi.Service.Domain.Entities;
using Shogun.Syllabi.Service.Domain.Repositories;

namespace Shogun.Syllabi.Service.Application.Services;

public class ElectivesService
{
    private readonly IElectivesRepository _repo;

    public ElectivesService(IElectivesRepository repo) => _repo = repo;

    public async Task<PagedResult<ElectiveDto>> ListAsync(ElectivesListQuery query, CancellationToken ct = default)
    {
        var result = await _repo.ListAsync(query, ct);
        var dtos = result.Items.Select(Map).ToList();
        return new PagedResult<ElectiveDto>(dtos, result.TotalCount, result.Page, result.PageSize);
    }

    public async Task<ElectiveDto?> GetByIdAsync(string id, CancellationToken ct = default)
    {
        var entity = await _repo.GetByIdAsync(id, ct);
        return entity is null ? null : Map(entity);
    }

    public async Task<ElectiveDto> CreateAsync(CreateElectiveRequest req, CancellationToken ct = default)
    {
        var entity = new Elective
        {
            elective_type = req.elective_type,
            tryb_studiow = req.tryb_studiow,
            is_stary = req.is_stary,
            lang = req.lang,
            _source = req._source,
            ExtraElements = BsonMapper.ToBsonDocument(req.data),
        };
        var created = await _repo.CreateAsync(entity, ct);
        return Map(created);
    }

    public async Task<ElectiveDto?> UpdateAsync(string id, UpdateElectiveRequest req, CancellationToken ct = default)
    {
        var entity = new Elective
        {
            elective_type = req.elective_type,
            tryb_studiow = req.tryb_studiow,
            is_stary = req.is_stary,
            lang = req.lang,
            _source = req._source,
            ExtraElements = BsonMapper.ToBsonDocument(req.data),
        };
        var updated = await _repo.UpdateAsync(id, entity, ct);
        return updated is null ? null : Map(updated);
    }

    public Task<bool> DeleteAsync(string id, CancellationToken ct = default)
        => _repo.DeleteAsync(id, ct);

    private static ElectiveDto Map(Elective e) => new(
        e.Id!,
        e.elective_type,
        e.tryb_studiow,
        e.is_stary,
        e.lang,
        e._source,
        BsonMapper.ToJsonObject(e.ExtraElements));
}

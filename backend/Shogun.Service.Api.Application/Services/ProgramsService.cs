using Shogun.Service.Api.Application.DTOs;
using Shogun.Service.Api.Application.Mapping;
using Shogun.Service.Api.Domain.Entities;
using Shogun.Service.Api.Domain.Repositories;

namespace Shogun.Service.Api.Application.Services;

public class ProgramsService
{
    private readonly IProgramsRepository _repo;

    public ProgramsService(IProgramsRepository repo) => _repo = repo;

    public async Task<PagedResult<ProgramDto>> ListAsync(ProgramsListQuery query, CancellationToken ct = default)
    {
        var result = await _repo.ListAsync(query, ct);
        var dtos = result.Items.Select(Map).ToList();
        return new PagedResult<ProgramDto>(dtos, result.TotalCount, result.Page, result.PageSize);
    }

    public async Task<ProgramDto?> GetByIdAsync(string id, CancellationToken ct = default)
    {
        var entity = await _repo.GetByIdAsync(id, ct);
        return entity is null ? null : Map(entity);
    }

    public async Task<ProgramDto> CreateAsync(CreateProgramRequest req, CancellationToken ct = default)
    {
        var entity = new Domain.Entities.Program
        {
            tryb_studiow = req.tryb_studiow,
            is_stary = req.is_stary,
            lang = req.lang,
            _source = req._source,
            ExtraElements = BsonMapper.ToBsonDocument(req.data),
        };
        var created = await _repo.CreateAsync(entity, ct);
        return Map(created);
    }

    public async Task<ProgramDto?> UpdateAsync(string id, UpdateProgramRequest req, CancellationToken ct = default)
    {
        var entity = new Domain.Entities.Program
        {
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

    private static ProgramDto Map(Domain.Entities.Program p) => new(
        p.Id!,
        p.tryb_studiow,
        p.is_stary,
        p.lang,
        p._source,
        BsonMapper.ToJsonObject(p.ExtraElements));
}

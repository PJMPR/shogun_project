using Shogun.Syllabi.Service.Application.DTOs;
using Shogun.Syllabi.Service.Application.Mapping;
using Shogun.Syllabi.Service.Domain.Entities;
using Shogun.Syllabi.Service.Domain.Repositories;

namespace Shogun.Syllabi.Service.Application.Services;

public class SyllabiService
{
    private readonly ISyllabiRepository _repo;

    public SyllabiService(ISyllabiRepository repo) => _repo = repo;

    public async Task<PagedResult<SyllabusDto>> ListAsync(SyllabiListQuery query, CancellationToken ct = default)
    {
        var result = await _repo.ListAsync(query, ct);
        var dtos = result.Items.Select(Map).ToList();
        return new PagedResult<SyllabusDto>(dtos, result.TotalCount, result.Page, result.PageSize);
    }

    public async Task<SyllabusDto?> GetByIdAsync(string id, CancellationToken ct = default)
    {
        var entity = await _repo.GetByIdAsync(id, ct);
        return entity is null ? null : Map(entity);
    }

    public async Task<SyllabusDto> CreateAsync(CreateSyllabusRequest req, CancellationToken ct = default)
    {
        var entity = new Syllabus
        {
            kod_przedmiotu = req.kod_przedmiotu,
            tryb_studiow = req.tryb_studiow,
            is_stary = req.is_stary,
            _source = req._source,
            sylabus = BsonMapper.ToBsonDocument(req.sylabus),
        };
        var created = await _repo.CreateAsync(entity, ct);
        return Map(created);
    }

    public async Task<SyllabusDto?> UpdateAsync(string id, UpdateSyllabusRequest req, CancellationToken ct = default)
    {
        var entity = new Syllabus
        {
            kod_przedmiotu = req.kod_przedmiotu,
            tryb_studiow = req.tryb_studiow,
            is_stary = req.is_stary,
            _source = req._source,
            sylabus = BsonMapper.ToBsonDocument(req.sylabus),
        };
        var updated = await _repo.UpdateAsync(id, entity, ct);
        return updated is null ? null : Map(updated);
    }

    public Task<bool> DeleteAsync(string id, CancellationToken ct = default)
        => _repo.DeleteAsync(id, ct);

    private static SyllabusDto Map(Syllabus s) => new(
        s.Id!,
        s.kod_przedmiotu,
        s.tryb_studiow,
        s.is_stary,
        s._source,
        BsonMapper.ToJsonObject(s.sylabus));
}

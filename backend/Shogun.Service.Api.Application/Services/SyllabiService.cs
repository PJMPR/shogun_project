using Shogun.Service.Api.Application.DTOs;
using Shogun.Service.Api.Domain.Entities;
using Shogun.Service.Api.Domain.Repositories;

namespace Shogun.Service.Api.Application.Services;

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
            SubjectCode = req.SubjectCode,
            StudyMode = req.StudyMode,
            IsLegacy = req.IsLegacy,
            Source = req.Source,
            Content = req.Content,
        };
        var created = await _repo.CreateAsync(entity, ct);
        return Map(created);
    }

    public async Task<SyllabusDto?> UpdateAsync(string id, UpdateSyllabusRequest req, CancellationToken ct = default)
    {
        var entity = new Syllabus
        {
            SubjectCode = req.SubjectCode,
            StudyMode = req.StudyMode,
            IsLegacy = req.IsLegacy,
            Source = req.Source,
            Content = req.Content,
        };
        var updated = await _repo.UpdateAsync(id, entity, ct);
        return updated is null ? null : Map(updated);
    }

    public Task<bool> DeleteAsync(string id, CancellationToken ct = default)
        => _repo.DeleteAsync(id, ct);

    private static SyllabusDto Map(Syllabus s) => new(
        s.Id!,
        s.SubjectCode,
        s.StudyMode,
        s.IsLegacy,
        s.Source,
        s.Content);
}

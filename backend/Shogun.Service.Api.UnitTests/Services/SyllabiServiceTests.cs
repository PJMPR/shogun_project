using FluentAssertions;
using NSubstitute;
using Shogun.Service.Api.Application.DTOs;
using Shogun.Service.Api.Application.Services;
using Shogun.Service.Api.Domain.Entities;
using Shogun.Service.Api.Domain.Repositories;

namespace Shogun.Service.Api.UnitTests.Services;

public class SyllabiServiceTests
{
    private readonly ISyllabiRepository _repo = Substitute.For<ISyllabiRepository>();
    private readonly SyllabiService _svc;

    public SyllabiServiceTests() => _svc = new SyllabiService(_repo);

    [Fact]
    public async Task GetByIdAsync_returns_null_when_not_found()
    {
        _repo.GetByIdAsync("missing_id", default).Returns((Syllabus?)null);
        var result = await _svc.GetByIdAsync("missing_id");
        result.Should().BeNull();
    }

    [Fact]
    public async Task GetByIdAsync_maps_entity_to_dto()
    {
        var entity = new Syllabus
        {
            Id = "64a1b2c3d4e5f6a7b8c9d0e1",
            SubjectCode = "PRG1",
            StudyMode = "stacjonarny",
            IsLegacy = false,
            Content = new SyllabusContent { StudyYear = 1 },
        };
        _repo.GetByIdAsync("64a1b2c3d4e5f6a7b8c9d0e1", default).Returns(entity);

        var dto = await _svc.GetByIdAsync("64a1b2c3d4e5f6a7b8c9d0e1");

        dto.Should().NotBeNull();
        dto!.SubjectCode.Should().Be("PRG1");
        dto.StudyMode.Should().Be("stacjonarny");
        dto.IsLegacy.Should().BeFalse();
    }

    [Fact]
    public async Task DeleteAsync_delegates_to_repo()
    {
        _repo.DeleteAsync("some_id", default).Returns(true);
        var deleted = await _svc.DeleteAsync("some_id");
        deleted.Should().BeTrue();
    }
}

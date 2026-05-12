using FluentAssertions;
using NSubstitute;
using Shogun.Syllabi.Service.Application.DTOs;
using Shogun.Syllabi.Service.Application.Services;
using Shogun.Syllabi.Service.Domain.Entities;
using Shogun.Syllabi.Service.Domain.Repositories;
using MongoDB.Bson;

namespace Shogun.Syllabi.Service.UnitTests.Services;

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
            kod_przedmiotu = "PRG1",
            tryb_studiow = "stacjonarny",
            is_stary = false,
            sylabus = new BsonDocument { { "rok_studiow", 1 } },
        };
        _repo.GetByIdAsync("64a1b2c3d4e5f6a7b8c9d0e1", default).Returns(entity);

        var dto = await _svc.GetByIdAsync("64a1b2c3d4e5f6a7b8c9d0e1");

        dto.Should().NotBeNull();
        dto!.kod_przedmiotu.Should().Be("PRG1");
        dto.tryb_studiow.Should().Be("stacjonarny");
        dto.is_stary.Should().BeFalse();
    }

    [Fact]
    public async Task DeleteAsync_delegates_to_repo()
    {
        _repo.DeleteAsync("some_id", default).Returns(true);
        var deleted = await _svc.DeleteAsync("some_id");
        deleted.Should().BeTrue();
    }
}

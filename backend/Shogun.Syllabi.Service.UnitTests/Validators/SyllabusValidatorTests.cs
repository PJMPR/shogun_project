using FluentAssertions;
using Shogun.Syllabi.Service.Application.DTOs;
using Shogun.Syllabi.Service.Application.Validators;

namespace Shogun.Syllabi.Service.UnitTests.Validators;

public class SyllabusValidatorTests
{
    private readonly CreateSyllabusRequestValidator _validator = new();

    [Fact]
    public async Task Valid_request_passes()
    {
        var req = new CreateSyllabusRequest("PRG1", "stacjonarny", false, null, null);
        var result = await _validator.ValidateAsync(req);
        result.IsValid.Should().BeTrue();
    }

    [Theory]
    [InlineData("", "stacjonarny")]
    [InlineData(null, "stacjonarny")]
    public async Task Missing_kod_przedmiotu_fails(string? kod, string tryb)
    {
        var req = new CreateSyllabusRequest(kod!, tryb, false, null, null);
        var result = await _validator.ValidateAsync(req);
        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e => e.PropertyName == "kod_przedmiotu");
    }

    [Theory]
    [InlineData("PRG1", "wieczorowy")]
    [InlineData("PRG1", "")]
    [InlineData("PRG1", null)]
    public async Task Invalid_tryb_studiow_fails(string kod, string? tryb)
    {
        var req = new CreateSyllabusRequest(kod, tryb!, false, null, null);
        var result = await _validator.ValidateAsync(req);
        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e => e.PropertyName == "tryb_studiow");
    }

    [Fact]
    public async Task Kod_too_long_fails()
    {
        var req = new CreateSyllabusRequest(new string('X', 21), "stacjonarny", false, null, null);
        var result = await _validator.ValidateAsync(req);
        result.IsValid.Should().BeFalse();
    }
}

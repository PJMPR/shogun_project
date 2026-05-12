using FluentAssertions;
using Shogun.Service.Api.Application.DTOs;
using Shogun.Service.Api.Application.Validators;

namespace Shogun.Service.Api.UnitTests.Validators;

public class ProgramValidatorTests
{
    private readonly CreateProgramRequestValidator _validator = new();

    [Fact]
    public async Task Valid_request_passes()
    {
        var req = new CreateProgramRequest("stacjonarny", false, "pl", null, null);
        var result = await _validator.ValidateAsync(req);
        result.IsValid.Should().BeTrue();
    }

    [Theory]
    [InlineData("stacjonarny", "xx")]
    [InlineData("stacjonarny", "")]
    public async Task Invalid_lang_fails(string tryb, string lang)
    {
        var req = new CreateProgramRequest(tryb, false, lang, null, null);
        var result = await _validator.ValidateAsync(req);
        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e => e.PropertyName == "lang");
    }
}

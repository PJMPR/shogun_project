using FluentAssertions;
using Shogun.Syllabi.Service.Application.DTOs;
using Shogun.Syllabi.Service.Application.Validators;

namespace Shogun.Syllabi.Service.UnitTests.Validators;

public class ElectiveValidatorTests
{
    private readonly CreateElectiveRequestValidator _validator = new();

    [Fact]
    public async Task Valid_request_passes()
    {
        var req = new CreateElectiveRequest("other", "stacjonarny", false, "pl", null, null);
        var result = await _validator.ValidateAsync(req);
        result.IsValid.Should().BeTrue();
    }

    [Fact]
    public async Task Invalid_elective_type_fails()
    {
        var req = new CreateElectiveRequest("unknown", "stacjonarny", false, "pl", null, null);
        var result = await _validator.ValidateAsync(req);
        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e => e.PropertyName == "elective_type");
    }
}

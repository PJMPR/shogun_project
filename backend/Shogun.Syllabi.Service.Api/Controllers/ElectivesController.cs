using FluentValidation;
using Microsoft.AspNetCore.Mvc;
using Shogun.Syllabi.Service.Application.DTOs;
using Shogun.Syllabi.Service.Application.Services;
using Shogun.Syllabi.Service.Domain.Repositories;

namespace Shogun.Syllabi.Service.Api.Controllers;

[ApiController]
[Route("api/v1/electives")]
[Produces("application/json")]
public class ElectivesController : ControllerBase
{
    private readonly ElectivesService _svc;
    private readonly IValidator<CreateElectiveRequest> _createValidator;
    private readonly IValidator<UpdateElectiveRequest> _updateValidator;

    public ElectivesController(
        ElectivesService svc,
        IValidator<CreateElectiveRequest> createValidator,
        IValidator<UpdateElectiveRequest> updateValidator)
    {
        _svc = svc;
        _createValidator = createValidator;
        _updateValidator = updateValidator;
    }

    /// <summary>List elective courses with pagination and filters.</summary>
    [HttpGet]
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    public async Task<IActionResult> List(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? sortBy = null,
        [FromQuery] string sortDir = "asc",
        [FromQuery] string? search = null,
        [FromQuery] string? elective_type = null,
        [FromQuery] string? tryb_studiow = null,
        [FromQuery] bool? is_stary = null,
        [FromQuery] string? lang = null,
        CancellationToken ct = default)
    {
        var query = new ElectivesListQuery(page, pageSize, sortBy, sortDir, search, elective_type, tryb_studiow, is_stary, lang);
        var result = await _svc.ListAsync(query, ct);
        return Ok(new { result.TotalCount, result.Page, result.PageSize, result.Items });
    }

    /// <summary>Get a single elective document by MongoDB ObjectId.</summary>
    [HttpGet("{id}")]
    [ProducesResponseType(typeof(ElectiveDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetById(string id, CancellationToken ct = default)
    {
        var dto = await _svc.GetByIdAsync(id, ct);
        return dto is null ? NotFound() : Ok(dto);
    }

    /// <summary>Create a new elective document.</summary>
    [HttpPost]
    [ProducesResponseType(typeof(ElectiveDto), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Create([FromBody] CreateElectiveRequest req, CancellationToken ct = default)
    {
        var validation = await _createValidator.ValidateAsync(req, ct);
        if (!validation.IsValid)
            return ValidationProblem(new ValidationProblemDetails(validation.ToDictionary()));

        var dto = await _svc.CreateAsync(req, ct);
        return CreatedAtAction(nameof(GetById), new { id = dto.id }, dto);
    }

    /// <summary>Replace an existing elective document.</summary>
    [HttpPut("{id}")]
    [ProducesResponseType(typeof(ElectiveDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Update(string id, [FromBody] UpdateElectiveRequest req, CancellationToken ct = default)
    {
        var validation = await _updateValidator.ValidateAsync(req, ct);
        if (!validation.IsValid)
            return ValidationProblem(new ValidationProblemDetails(validation.ToDictionary()));

        var dto = await _svc.UpdateAsync(id, req, ct);
        return dto is null ? NotFound() : Ok(dto);
    }

    /// <summary>Delete an elective document.</summary>
    [HttpDelete("{id}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(string id, CancellationToken ct = default)
    {
        var deleted = await _svc.DeleteAsync(id, ct);
        return deleted ? NoContent() : NotFound();
    }
}

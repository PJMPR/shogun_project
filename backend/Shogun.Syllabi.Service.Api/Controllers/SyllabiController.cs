using FluentValidation;
using Microsoft.AspNetCore.Mvc;
using Shogun.Syllabi.Service.Application.DTOs;
using Shogun.Syllabi.Service.Application.Services;
using Shogun.Syllabi.Service.Domain.Repositories;

namespace Shogun.Syllabi.Service.Api.Controllers;

[ApiController]
[Route("api/v1/syllabi")]
[Produces("application/json")]
public class SyllabiController : ControllerBase
{
    private readonly SyllabiService _svc;
    private readonly IValidator<CreateSyllabusRequest> _createValidator;
    private readonly IValidator<UpdateSyllabusRequest> _updateValidator;

    public SyllabiController(
        SyllabiService svc,
        IValidator<CreateSyllabusRequest> createValidator,
        IValidator<UpdateSyllabusRequest> updateValidator)
    {
        _svc = svc;
        _createValidator = createValidator;
        _updateValidator = updateValidator;
    }

    /// <summary>List syllabi with pagination, filtering and full-text search.</summary>
    [HttpGet]
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    public async Task<IActionResult> List(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? sortBy = null,
        [FromQuery] string sortDir = "asc",
        [FromQuery] string? search = null,
        [FromQuery] string? kod_przedmiotu = null,
        [FromQuery] string? tryb_studiow = null,
        [FromQuery] bool? is_stary = null,
        CancellationToken ct = default)
    {
        var query = new SyllabiListQuery(page, pageSize, sortBy, sortDir, search, kod_przedmiotu, tryb_studiow, is_stary);
        var result = await _svc.ListAsync(query, ct);
        return Ok(new
        {
            result.TotalCount,
            result.Page,
            result.PageSize,
            result.Items,
        });
    }

    /// <summary>Get a single syllabus by MongoDB ObjectId.</summary>
    [HttpGet("{id}")]
    [ProducesResponseType(typeof(SyllabusDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetById(string id, CancellationToken ct = default)
    {
        var dto = await _svc.GetByIdAsync(id, ct);
        return dto is null ? NotFound() : Ok(dto);
    }

    /// <summary>Create a new syllabus document.</summary>
    [HttpPost]
    [ProducesResponseType(typeof(SyllabusDto), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Create([FromBody] CreateSyllabusRequest req, CancellationToken ct = default)
    {
        var validation = await _createValidator.ValidateAsync(req, ct);
        if (!validation.IsValid)
            return ValidationProblem(new ValidationProblemDetails(validation.ToDictionary()));

        var dto = await _svc.CreateAsync(req, ct);
        return CreatedAtAction(nameof(GetById), new { id = dto.id }, dto);
    }

    /// <summary>Replace an existing syllabus document.</summary>
    [HttpPut("{id}")]
    [ProducesResponseType(typeof(SyllabusDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Update(string id, [FromBody] UpdateSyllabusRequest req, CancellationToken ct = default)
    {
        var validation = await _updateValidator.ValidateAsync(req, ct);
        if (!validation.IsValid)
            return ValidationProblem(new ValidationProblemDetails(validation.ToDictionary()));

        var dto = await _svc.UpdateAsync(id, req, ct);
        return dto is null ? NotFound() : Ok(dto);
    }

    /// <summary>Delete a syllabus document.</summary>
    [HttpDelete("{id}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(string id, CancellationToken ct = default)
    {
        var deleted = await _svc.DeleteAsync(id, ct);
        return deleted ? NoContent() : NotFound();
    }
}

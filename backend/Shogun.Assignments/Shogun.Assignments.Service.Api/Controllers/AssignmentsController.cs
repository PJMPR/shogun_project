using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Shogun.Assignments.Service.Api.Application.DTOs;
using Shogun.Assignments.Service.Api.Application.Services;

namespace Shogun.Assignments.Service.Api.Controllers;

[ApiController]
[Route("api/v1/assignments")]
[Authorize(Policy = "AssignmentsAccess")]
public class AssignmentsController(IAssignmentService service) : ControllerBase
{
    [HttpPost]
    [ProducesResponseType(typeof(AssignmentResponseDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Create(
        [FromBody] CreateAssignmentDto dto,
        CancellationToken ct)
    {
        var result = await service.CreateAsync(dto, ct);
        return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
    }

    [HttpGet("{id:int}")]
    [ProducesResponseType(typeof(AssignmentResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetById(int id, CancellationToken ct)
    {
        var result = await service.GetByIdAsync(id, ct);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<AssignmentResponseDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAll(CancellationToken ct)
    {
        var result = await service.GetAllAsync(ct);
        return Ok(result);
    }
}

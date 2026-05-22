using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Shogun.Users.Application.Dtos;
using Shogun.Users.Application.Services;

namespace Shogun.Users.Api.Controllers;

[ApiController]
[Route("api/v1/users")]
[Produces("application/json")]
[Authorize(Policy = "AdminOnly")]
public class UsersController(IUsersService usersService) : ControllerBase
{
    [HttpGet("roles")]
    public async Task<IActionResult> GetManagedRoles(CancellationToken ct)
    {
        var roles = await usersService.GetManagedRolesAsync(ct);
        return Ok(roles);
    }

    [HttpGet]
    public async Task<IActionResult> GetUsers(CancellationToken ct)
    {
        var users = await usersService.GetUsersAsync(ct);
        return Ok(users);
    }

    [HttpGet("{userId}/roles")]
    public async Task<IActionResult> GetUserRoles(string userId, CancellationToken ct)
    {
        var roles = await usersService.GetUserRolesAsync(userId, ct);
        return Ok(roles);
    }

    [HttpPut("{userId}/roles")]
    public async Task<IActionResult> SetUserRoles(
        string userId,
        [FromBody] SetRolesRequest request,
        CancellationToken ct)
    {
        var actorId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
                   ?? User.FindFirst("sub")?.Value
                   ?? "unknown";

        await usersService.SetUserRolesAsync(userId, request.Roles, actorId, ct);
        return NoContent();
    }
}

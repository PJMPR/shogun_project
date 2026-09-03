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

    [HttpGet("roles/{roleName}")]
    public async Task<IActionResult> GetManagedRole(string roleName, CancellationToken ct)
    {
        var role = await usersService.GetManagedRoleAsync(roleName, ct);
        return Ok(role);
    }

    [HttpPost("roles")]
    public async Task<IActionResult> CreateManagedRole([FromBody] CreateRoleRequest request, CancellationToken ct)
    {
        await usersService.CreateManagedRoleAsync(request.Name, request.Description, request.Attributes, ct);
        return Created(string.Empty, new { name = request.Name });
    }

    [HttpPut("roles/{roleName}")]
    public async Task<IActionResult> UpdateManagedRole(
        string roleName,
        [FromBody] UpdateRoleRequest request,
        CancellationToken ct)
    {
        await usersService.UpdateManagedRoleAsync(roleName, request.Name, request.Description, request.Attributes, ct);
        return NoContent();
    }

    [HttpDelete("roles/{roleName}")]
    public async Task<IActionResult> DeleteManagedRole(string roleName, CancellationToken ct)
    {
        await usersService.DeleteManagedRoleAsync(roleName, ct);
        return NoContent();
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

[ApiController]
[Route("api/v1/user-directory")]
[Produces("application/json")]
[Authorize(Roles = "admin,planner,lecturer")]
public sealed class UserDirectoryController(IUsersService usersService) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<UserDirectoryItemDto>>> Search(
        [FromQuery] string query,
        [FromQuery] int limit = 20,
        CancellationToken ct = default)
    {
        var currentUserId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
            ?? User.FindFirst("sub")?.Value
            ?? string.Empty;
        return Ok(await usersService.SearchUserDirectoryAsync(query ?? string.Empty, limit, currentUserId, ct));
    }

    [HttpPost("resolve")]
    public async Task<ActionResult<IReadOnlyList<UserDirectoryItemDto>>> Resolve(ResolveUserDirectoryRequest request, CancellationToken ct) =>
        Ok(await usersService.ResolveUserDirectoryAsync(request.UserIds, ct));
}

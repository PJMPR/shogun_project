using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Shogun.Users.Application.Services;

namespace Shogun.Users.Api.Controllers;

[ApiController]
[Route("api/v1/me")]
[Produces("application/json")]
[Authorize]
public class MeController(IUsersService usersService) : ControllerBase
{
    [HttpGet("projects")]
    public async Task<IActionResult> GetMyProjects(CancellationToken ct)
    {
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
                   ?? User.FindFirst("sub")?.Value;

        if (string.IsNullOrWhiteSpace(userId))
            return Unauthorized(new { message = "User identifier not found in token." });

        var projects = await usersService.GetUserProjectsAsync(userId, ct);
        return Ok(new { projects });
    }
}

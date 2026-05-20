using Shogun.Users.Application.Dtos;
using Shogun.Users.Domain.Entities;
using Shogun.Users.Domain.Repositories;

namespace Shogun.Users.Application.Services;

public sealed class UsersService(
    IKeycloakAdminPort keycloak,
    IAuditLogRepository auditLog) : IUsersService
{
    private static readonly IReadOnlyList<string> ManagedRoles = ["admin", "coordinator", "lecturer"];

    public async Task<IReadOnlyList<UserDto>> GetUsersAsync(CancellationToken ct = default)
    {
        var users = await keycloak.GetUsersAsync(ct);
        var result = new List<UserDto>(users.Count);

        foreach (var user in users)
        {
            var roles = await keycloak.GetUserManagedRolesAsync(user.Id, ManagedRoles, ct);
            result.Add(new UserDto(user.Id, user.Username, user.FirstName, user.LastName, user.Email, user.Enabled, roles));
        }

        return result;
    }

    public async Task<IReadOnlyList<string>> GetUserRolesAsync(string userId, CancellationToken ct = default)
    {
        return await keycloak.GetUserManagedRolesAsync(userId, ManagedRoles, ct);
    }

    public async Task SetUserRolesAsync(string userId, IReadOnlyList<string> roles, string actorId, CancellationToken ct = default)
    {
        var requested = roles.Where(r => ManagedRoles.Contains(r)).ToList();
        var current = await keycloak.GetUserManagedRolesAsync(userId, ManagedRoles, ct);

        var toAdd = requested.Except(current).ToList();
        var toRemove = current.Except(requested).ToList();

        if (toAdd.Count > 0)
            await keycloak.AddRolesToUserAsync(userId, toAdd, ct);

        if (toRemove.Count > 0)
            await keycloak.RemoveRolesFromUserAsync(userId, toRemove, ct);

        var entry = new RoleChangeAuditLog
        {
            UserId = userId,
            ActorId = actorId,
            AddedRoles = string.Join(",", toAdd),
            RemovedRoles = string.Join(",", toRemove),
            ChangedAt = DateTime.UtcNow,
        };
        await auditLog.AddAsync(entry, ct);
    }
}

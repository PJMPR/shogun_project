using Shogun.Users.Application.Dtos;
using Shogun.Users.Domain.Repositories;

namespace Shogun.Users.Application.Services;

public sealed class UsersService(IKeycloakAdminPort keycloak) : IUsersService
{
    public Task<IReadOnlyList<string>> GetManagedRolesAsync(CancellationToken ct = default)
        => keycloak.GetManagedRoleNamesAsync(ct);

    public async Task<IReadOnlyList<UserDto>> GetUsersAsync(CancellationToken ct = default)
    {
        var managedRoles = await keycloak.GetManagedRoleNamesAsync(ct);
        var users = await keycloak.GetUsersAsync(ct);
        var result = new List<UserDto>(users.Count);

        foreach (var user in users)
        {
            var roles = await keycloak.GetUserManagedRolesAsync(user.Id, managedRoles, ct);
            result.Add(new UserDto(user.Id, user.Username, user.FirstName, user.LastName, user.Email, user.Enabled, roles));
        }

        return result;
    }

    public async Task<IReadOnlyList<string>> GetUserRolesAsync(string userId, CancellationToken ct = default)
    {
        var managedRoles = await keycloak.GetManagedRoleNamesAsync(ct);
        return await keycloak.GetUserManagedRolesAsync(userId, managedRoles, ct);
    }

    public async Task SetUserRolesAsync(string userId, IReadOnlyList<string> roles, string actorId, CancellationToken ct = default)
    {
        var managedRoles = await keycloak.GetManagedRoleNamesAsync(ct);
        var requested = roles.Where(r => managedRoles.Contains(r)).ToList();
        var current = await keycloak.GetUserManagedRolesAsync(userId, managedRoles, ct);

        var toAdd = requested.Except(current).ToList();
        var toRemove = current.Except(requested).ToList();

        if (toAdd.Count > 0)
            await keycloak.AddRolesToUserAsync(userId, toAdd, ct);

        if (toRemove.Count > 0)
            await keycloak.RemoveRolesFromUserAsync(userId, toRemove, ct);
    }
}

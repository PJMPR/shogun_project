namespace Shogun.Users.Domain.Repositories;

/// <summary>Port (interface) for calling Keycloak Admin API.</summary>
public interface IKeycloakAdminPort
{
    Task<IReadOnlyList<KeycloakUserRecord>> GetUsersAsync(CancellationToken ct = default);

    /// <summary>Returns names of realm roles whose description equals "shogun".</summary>
    Task<IReadOnlyList<string>> GetManagedRoleNamesAsync(CancellationToken ct = default);

    Task<IReadOnlyList<string>> GetUserManagedRolesAsync(
        string userId,
        IReadOnlyList<string> managedRoles,
        CancellationToken ct = default);

    Task AddRolesToUserAsync(string userId, IReadOnlyList<string> roleNames, CancellationToken ct = default);
    Task RemoveRolesFromUserAsync(string userId, IReadOnlyList<string> roleNames, CancellationToken ct = default);
}

public sealed record KeycloakUserRecord(
    string Id,
    string Username,
    string? FirstName,
    string? LastName,
    string? Email,
    bool Enabled);

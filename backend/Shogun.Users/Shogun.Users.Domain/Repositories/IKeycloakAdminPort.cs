namespace Shogun.Users.Domain.Repositories;

/// <summary>Port (interface) for calling Keycloak Admin API.</summary>
public interface IKeycloakAdminPort
{
    Task<IReadOnlyList<KeycloakUserRecord>> GetUsersAsync(CancellationToken ct = default);
    Task<KeycloakRoleRecord> GetRealmRoleAsync(string roleName, CancellationToken ct = default);
    Task<IReadOnlyList<KeycloakRoleRecord>> GetRealmRolesAsync(CancellationToken ct = default);
    Task<IReadOnlyList<KeycloakRoleRecord>> GetManagedRolesAsync(CancellationToken ct = default);

    /// <summary>Returns names of realm roles managed by Shogun.</summary>
    Task<IReadOnlyList<string>> GetManagedRoleNamesAsync(CancellationToken ct = default);

    Task<IReadOnlyList<string>> GetUserManagedRolesAsync(
        string userId,
        IReadOnlyList<string> managedRoles,
        CancellationToken ct = default);

    Task AddRolesToUserAsync(string userId, IReadOnlyList<string> roleNames, CancellationToken ct = default);
    Task RemoveRolesFromUserAsync(string userId, IReadOnlyList<string> roleNames, CancellationToken ct = default);
    Task CreateRealmRoleAsync(
        string roleName,
        string description,
        IReadOnlyDictionary<string, IReadOnlyList<string>> attributes,
        CancellationToken ct = default);

    Task UpdateRealmRoleAsync(
        string currentRoleName,
        string newRoleName,
        string description,
        IReadOnlyDictionary<string, IReadOnlyList<string>> attributes,
        CancellationToken ct = default);

    Task DeleteRealmRoleAsync(string roleName, CancellationToken ct = default);
}

public sealed record KeycloakUserRecord(
    string Id,
    string Username,
    string? FirstName,
    string? LastName,
    string? Email,
    bool Enabled);

public sealed record KeycloakRoleRecord(
    string Name,
    string? Description,
    IReadOnlyDictionary<string, IReadOnlyList<string>> Attributes);

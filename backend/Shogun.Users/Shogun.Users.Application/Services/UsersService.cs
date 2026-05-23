using Shogun.Users.Application.Dtos;
using Shogun.Users.Domain.Repositories;
using System.Text.RegularExpressions;

namespace Shogun.Users.Application.Services;

public sealed class UsersService(IKeycloakAdminPort keycloak) : IUsersService
{
    private const string ManagedRoleMarker = "shogun";
    private const string ManagedRoleAttributeKey = "managedBy";
    private const int MaxDescriptionLength = 200;
    private const int MaxAttributesCount = 50;
    private const int MaxAttributeKeyLength = 64;
    private const int MaxAttributeValuesPerKey = 20;
    private const int MaxAttributeValueLength = 200;
    private static readonly Regex RoleNameRegex =
        new("^[A-Za-z0-9][A-Za-z0-9:_-]{1,62}[A-Za-z0-9]$", RegexOptions.Compiled);
    private static readonly char[] ProjectSeparators = [',', ';'];

    public async Task<IReadOnlyList<ManagedRoleDto>> GetManagedRolesAsync(CancellationToken ct = default)
    {
        var roles = await keycloak.GetManagedRolesAsync(ct);
        return roles
            .Select(MapToManagedRoleDto)
            .ToList();
    }

    public async Task<ManagedRoleDto> GetManagedRoleAsync(string roleName, CancellationToken ct = default)
    {
        var normalized = ValidateRoleName(roleName, nameof(roleName));
        var role = await keycloak.GetRealmRoleAsync(normalized, ct);

        if (!IsManagedRole(role))
            throw new KeyNotFoundException($"Managed role '{normalized}' was not found.");

        return MapToManagedRoleDto(role);
    }

    public async Task CreateManagedRoleAsync(
        string roleName,
        string? description,
        IReadOnlyDictionary<string, IReadOnlyList<string>>? attributes,
        CancellationToken ct = default)
    {
        var normalized = ValidateRoleName(roleName, nameof(roleName));
        var managedDescription = BuildManagedDescription(description);
        var normalizedAttributes = NormalizeAttributes(attributes);
        await keycloak.CreateRealmRoleAsync(normalized, managedDescription, normalizedAttributes, ct);
    }

    public async Task UpdateManagedRoleAsync(
        string currentRoleName,
        string newRoleName,
        string? description,
        IReadOnlyDictionary<string, IReadOnlyList<string>>? attributes,
        CancellationToken ct = default)
    {
        var currentNormalized = ValidateRoleName(currentRoleName, nameof(currentRoleName));
        var newNormalized = ValidateRoleName(newRoleName, nameof(newRoleName));
        await EnsureRoleIsManagedAsync(currentNormalized, ct);

        var managedDescription = BuildManagedDescription(description);
        var normalizedAttributes = NormalizeAttributes(attributes);
        await keycloak.UpdateRealmRoleAsync(currentNormalized, newNormalized, managedDescription, normalizedAttributes, ct);
    }

    public async Task DeleteManagedRoleAsync(string roleName, CancellationToken ct = default)
    {
        var normalized = ValidateRoleName(roleName, nameof(roleName));
        await EnsureRoleIsManagedAsync(normalized, ct);
        await keycloak.DeleteRealmRoleAsync(normalized, ct);
    }

    public async Task<IReadOnlyList<string>> GetUserProjectsAsync(string userId, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(userId))
            throw new ArgumentException("User id cannot be empty.", nameof(userId));

        var realmRoles = await keycloak.GetRealmRolesAsync(ct);
        var realmRoleNames = realmRoles.Select(r => r.Name).ToList();
        var userRoles = await keycloak.GetUserManagedRolesAsync(userId, realmRoleNames, ct);
        var userRoleSet = userRoles.ToHashSet(StringComparer.OrdinalIgnoreCase);

        var projects = realmRoles
            .Where(role => userRoleSet.Contains(role.Name))
            .SelectMany(ExtractProjects)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

        return projects;
    }

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

    private static string ValidateRoleName(string roleName, string paramName)
    {
        if (string.IsNullOrWhiteSpace(roleName))
            throw new ArgumentException("Role name cannot be empty.", paramName);

        var normalized = roleName.Trim();
        if (!RoleNameRegex.IsMatch(normalized))
            throw new ArgumentException(
                "Role name must be 3-64 chars and contain only letters, digits, ':', '_' or '-'.",
                paramName);

        return normalized;
    }

    private static string BuildManagedDescription(string? description)
    {
        if (string.IsNullOrWhiteSpace(description))
            return string.Empty;

        var normalized = description.Trim();
        if (normalized.Length > MaxDescriptionLength)
            throw new ArgumentException("Role description must be at most 200 characters.", nameof(description));

        return normalized;
    }

    private static bool IsManagedDescription(string? description)
    {
        if (string.IsNullOrWhiteSpace(description))
            return false;

        var normalized = description.Trim();
        if (normalized.StartsWith("${role_", StringComparison.OrdinalIgnoreCase))
            return false;

        return true;
    }

    private static string? ExtractManagedDescription(string? description)
    {
        if (string.IsNullOrWhiteSpace(description))
            return null;

        if (description.Equals(ManagedRoleMarker, StringComparison.OrdinalIgnoreCase))
            return null;

        var prefix = $"{ManagedRoleMarker}:";
        if (!description.StartsWith(prefix, StringComparison.OrdinalIgnoreCase))
            return description;

        var payload = description[prefix.Length..].Trim();
        return string.IsNullOrWhiteSpace(payload) ? null : payload;
    }

    private static IReadOnlyDictionary<string, IReadOnlyList<string>> NormalizeAttributes(
        IReadOnlyDictionary<string, IReadOnlyList<string>>? attributes)
    {
        var source = attributes ?? new Dictionary<string, IReadOnlyList<string>>();
        if (source.Count > MaxAttributesCount)
            throw new ArgumentException("Role can contain at most 50 attributes.", nameof(attributes));

        var result = new Dictionary<string, IReadOnlyList<string>>(StringComparer.Ordinal);
        foreach (var (rawKey, rawValues) in source)
        {
            if (string.IsNullOrWhiteSpace(rawKey))
                throw new ArgumentException("Attribute key cannot be empty.", nameof(attributes));

            var key = rawKey.Trim();
            if (key.Length > MaxAttributeKeyLength)
                throw new ArgumentException("Attribute key length must be at most 64 characters.", nameof(attributes));

            if (rawValues is null || rawValues.Count == 0)
                throw new ArgumentException($"Attribute '{key}' must have at least one value.", nameof(attributes));

            if (rawValues.Count > MaxAttributeValuesPerKey)
                throw new ArgumentException($"Attribute '{key}' can contain at most 20 values.", nameof(attributes));

            var values = rawValues
                .Select(v => (v ?? string.Empty).Trim())
                .Where(v => !string.IsNullOrWhiteSpace(v))
                .Distinct(StringComparer.Ordinal)
                .ToList();

            if (values.Count == 0)
                throw new ArgumentException($"Attribute '{key}' must have at least one non-empty value.", nameof(attributes));

            if (values.Any(v => v.Length > MaxAttributeValueLength))
                throw new ArgumentException($"Attribute '{key}' value length must be at most 200 characters.", nameof(attributes));

            result[key] = values;
        }

        result[ManagedRoleAttributeKey] = [ManagedRoleMarker];

        return result;
    }

    private static IReadOnlyDictionary<string, IReadOnlyList<string>> NormalizeReadAttributes(
        IReadOnlyDictionary<string, IReadOnlyList<string>>? attributes)
    {
        if (attributes is null || attributes.Count == 0)
            return new Dictionary<string, IReadOnlyList<string>>();

        var result = new Dictionary<string, IReadOnlyList<string>>(StringComparer.Ordinal);
        foreach (var (key, values) in attributes)
        {
            if (string.IsNullOrWhiteSpace(key) || values is null)
                continue;

            if (string.Equals(key, ManagedRoleAttributeKey, StringComparison.OrdinalIgnoreCase))
                continue;

            var normalizedValues = values
                .Select(v => (v ?? string.Empty).Trim())
                .Where(v => !string.IsNullOrWhiteSpace(v))
                .Distinct(StringComparer.Ordinal)
                .ToList();

            if (normalizedValues.Count == 0)
                continue;

            result[key] = normalizedValues;
        }

        return result;
    }

    private async Task EnsureRoleIsManagedAsync(string roleName, CancellationToken ct)
    {
        var managedRoles = await keycloak.GetManagedRoleNamesAsync(ct);
        if (!managedRoles.Contains(roleName, StringComparer.OrdinalIgnoreCase))
            throw new KeyNotFoundException($"Managed role '{roleName}' was not found.");
    }

    private static ManagedRoleDto MapToManagedRoleDto(KeycloakRoleRecord role)
    {
        return new ManagedRoleDto(
            role.Name,
            ExtractManagedDescription(role.Description),
            NormalizeReadAttributes(role.Attributes));
    }

    private static bool IsManagedRole(KeycloakRoleRecord role)
    {
        if (role.Attributes.TryGetValue(ManagedRoleAttributeKey, out var values) &&
            values.Any(v => string.Equals(v, ManagedRoleMarker, StringComparison.OrdinalIgnoreCase)))
        {
            return true;
        }

        if (IsManagedDescription(role.Description))
            return true;

        return !IsSystemRoleName(role.Name);
    }

    private static bool IsSystemRoleName(string roleName)
    {
        if (string.IsNullOrWhiteSpace(roleName))
            return true;

        return roleName.Equals("offline_access", StringComparison.OrdinalIgnoreCase)
            || roleName.Equals("uma_authorization", StringComparison.OrdinalIgnoreCase)
            || roleName.StartsWith("default-roles-", StringComparison.OrdinalIgnoreCase);
    }

    private static IEnumerable<string> ExtractProjects(KeycloakRoleRecord role)
    {
        if (!role.Attributes.TryGetValue("projects", out var rawValues))
            return [];

        return rawValues
            .SelectMany(value => (value ?? string.Empty).Split(ProjectSeparators, StringSplitOptions.RemoveEmptyEntries))
            .Select(value => value.Trim().ToLowerInvariant())
            .Where(value => !string.IsNullOrWhiteSpace(value));
    }
}

using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Options;
using Shogun.Users.Domain.Repositories;
using Shogun.Users.Infrastructure.Keycloak;

namespace Shogun.Users.Infrastructure.Keycloak;

/// <summary>
/// Calls Keycloak Admin REST API using client_credentials to obtain a service-account token.
/// </summary>
public sealed class KeycloakAdminClient(
    IHttpClientFactory httpClientFactory,
    IOptions<KeycloakAdminOptions> options) : IKeycloakAdminPort
{
    private const string ManagedRoleMarker = "shogun";
    private const string ManagedRoleAttributeKey = "managedBy";
    private readonly KeycloakAdminOptions _opts = options.Value;
    private string? _cachedToken;
    private DateTime _tokenExpiry = DateTime.MinValue;

    // ── Token ──────────────────────────────────────────────────────────────

    private async Task<string> GetAdminTokenAsync(CancellationToken ct)
    {
        if (_cachedToken is not null && DateTime.UtcNow < _tokenExpiry)
            return _cachedToken;

        var client = httpClientFactory.CreateClient("keycloak-admin");
        var tokenUrl = $"{_opts.AdminBaseUrl}/auth/realms/{_opts.Realm}/protocol/openid-connect/token";

        var body = new Dictionary<string, string>
        {
            ["grant_type"] = "client_credentials",
            ["client_id"]  = _opts.ClientId,
            ["client_secret"] = _opts.ClientSecret,
        };

        var response = await client.PostAsync(tokenUrl, new FormUrlEncodedContent(body), ct);
        response.EnsureSuccessStatusCode();

        var json = await response.Content.ReadFromJsonAsync<JsonElement>(ct);
        _cachedToken = json.GetProperty("access_token").GetString()!;
        var expiresIn = json.GetProperty("expires_in").GetInt32();
        _tokenExpiry = DateTime.UtcNow.AddSeconds(expiresIn - 30);

        return _cachedToken;
    }

    private async Task<HttpClient> CreateAuthorizedClientAsync(CancellationToken ct)
    {
        var token = await GetAdminTokenAsync(ct);
        var client = httpClientFactory.CreateClient("keycloak-admin");
        client.DefaultRequestHeaders.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);
        return client;
    }

    // ── Users ─────────────────────────────────────────────────────────────

    public async Task<IReadOnlyList<KeycloakUserRecord>> GetUsersAsync(CancellationToken ct = default)
    {
        var client = await CreateAuthorizedClientAsync(ct);
        var url = $"{_opts.AdminBaseUrl}/auth/admin/realms/{_opts.Realm}/users?max=1000";

        var users = await client.GetFromJsonAsync<List<KcUser>>(url, ct) ?? [];
        return users.Select(u => new KeycloakUserRecord(u.Id, u.Username, u.FirstName, u.LastName, u.Email, u.Enabled)).ToList();
    }

    public async Task<KeycloakRoleRecord> GetRealmRoleAsync(string roleName, CancellationToken ct = default)
    {
        var role = await GetRealmRoleRepresentationAsync(roleName, ct);

        return new KeycloakRoleRecord(role.Name, role.Description, ToDomainAttributes(role.Attributes));
    }

    public async Task<IReadOnlyList<KeycloakRoleRecord>> GetRealmRolesAsync(CancellationToken ct = default)
    {
        var roles = await GetRealmRolesInternalAsync(ct);
        return roles
            .Select(r => new KeycloakRoleRecord(r.Name, r.Description, ToDomainAttributes(r.Attributes)))
            .ToList();
    }

    public async Task<IReadOnlyList<KeycloakRoleRecord>> GetManagedRolesAsync(CancellationToken ct = default)
    {
        var listedRoles = await GetRealmRolesInternalAsync(ct);
        return listedRoles
            .Where(IsManagedRole)
            .Select(r => new KeycloakRoleRecord(r.Name, r.Description, ToDomainAttributes(r.Attributes)))
            .ToList();
    }

    // ── Roles ─────────────────────────────────────────────────────────────

    public async Task<IReadOnlyList<string>> GetUserManagedRolesAsync(
        string userId, IReadOnlyList<string> managedRoles, CancellationToken ct = default)
    {
        var client = await CreateAuthorizedClientAsync(ct);
        var url = $"{_opts.AdminBaseUrl}/auth/admin/realms/{_opts.Realm}/users/{userId}/role-mappings/realm";

        var roles = await client.GetFromJsonAsync<List<KcRole>>(url, ct) ?? [];
        return roles
            .Where(r => managedRoles.Contains(r.Name))
            .Select(r => r.Name)
            .ToList();
    }

    public async Task AddRolesToUserAsync(string userId, IReadOnlyList<string> roleNames, CancellationToken ct = default)
    {
        var realmRoles = await GetRealmRolesInternalAsync(ct);
        var toAssign = realmRoles.Where(r => roleNames.Contains(r.Name)).ToList();
        if (toAssign.Count == 0) return;

        var client = await CreateAuthorizedClientAsync(ct);
        var url = $"{_opts.AdminBaseUrl}/auth/admin/realms/{_opts.Realm}/users/{userId}/role-mappings/realm";
        var response = await client.PostAsJsonAsync(url, toAssign, ct);
        response.EnsureSuccessStatusCode();
    }

    public async Task RemoveRolesFromUserAsync(string userId, IReadOnlyList<string> roleNames, CancellationToken ct = default)
    {
        var realmRoles = await GetRealmRolesInternalAsync(ct);
        var toRemove = realmRoles.Where(r => roleNames.Contains(r.Name)).ToList();
        if (toRemove.Count == 0) return;

        var client = await CreateAuthorizedClientAsync(ct);
        var url = $"{_opts.AdminBaseUrl}/auth/admin/realms/{_opts.Realm}/users/{userId}/role-mappings/realm";

        var request = new HttpRequestMessage(HttpMethod.Delete, url)
        {
            Content = JsonContent.Create(toRemove),
        };
        var response = await client.SendAsync(request, ct);
        response.EnsureSuccessStatusCode();
    }

    public async Task<IReadOnlyList<string>> GetManagedRoleNamesAsync(CancellationToken ct = default)
    {
        var managedRoles = await GetManagedRolesAsync(ct);
        return managedRoles.Select(r => r.Name).ToList();
    }

    public async Task CreateRealmRoleAsync(
        string roleName,
        string description,
        IReadOnlyDictionary<string, IReadOnlyList<string>> attributes,
        CancellationToken ct = default)
    {
        var client = await CreateAuthorizedClientAsync(ct);
        var url = $"{_opts.AdminBaseUrl}/auth/admin/realms/{_opts.Realm}/roles";

        var payload = new
        {
            name = roleName,
            description,
            attributes = ToKeycloakAttributes(attributes),
        };
        var response = await client.PostAsJsonAsync(url, payload, ct);

        if (response.StatusCode == System.Net.HttpStatusCode.Conflict)
            throw new InvalidOperationException($"Role '{roleName}' already exists.");

        if (response.StatusCode == System.Net.HttpStatusCode.Forbidden)
            throw new UnauthorizedAccessException("Keycloak denied role create. Grant 'manage-realm' to service account.");

        response.EnsureSuccessStatusCode();
    }

    public async Task UpdateRealmRoleAsync(
        string currentRoleName,
        string newRoleName,
        string description,
        IReadOnlyDictionary<string, IReadOnlyList<string>> attributes,
        CancellationToken ct = default)
    {
        var client = await CreateAuthorizedClientAsync(ct);
        var rolePath = Uri.EscapeDataString(currentRoleName);
        var url = $"{_opts.AdminBaseUrl}/auth/admin/realms/{_opts.Realm}/roles/{rolePath}";

        var payload = new
        {
            name = newRoleName,
            description,
            attributes = ToKeycloakAttributes(attributes),
        };
        var response = await client.PutAsJsonAsync(url, payload, ct);

        if (response.StatusCode == System.Net.HttpStatusCode.NotFound)
            throw new KeyNotFoundException($"Role '{currentRoleName}' was not found.");

        if (response.StatusCode == System.Net.HttpStatusCode.Conflict)
            throw new InvalidOperationException($"Role '{newRoleName}' already exists.");

        if (response.StatusCode == System.Net.HttpStatusCode.Forbidden)
            throw new UnauthorizedAccessException("Keycloak denied role update. Grant 'manage-realm' to service account.");

        response.EnsureSuccessStatusCode();
    }

    public async Task DeleteRealmRoleAsync(string roleName, CancellationToken ct = default)
    {
        var client = await CreateAuthorizedClientAsync(ct);
        var rolePath = Uri.EscapeDataString(roleName);
        var url = $"{_opts.AdminBaseUrl}/auth/admin/realms/{_opts.Realm}/roles/{rolePath}";

        var response = await client.DeleteAsync(url, ct);
        if (response.StatusCode == System.Net.HttpStatusCode.NotFound)
            throw new KeyNotFoundException($"Role '{roleName}' was not found.");

        if (response.StatusCode == System.Net.HttpStatusCode.Forbidden)
            throw new UnauthorizedAccessException("Keycloak denied role delete. Grant 'manage-realm' to service account.");

        response.EnsureSuccessStatusCode();
    }

    private async Task<List<KcRole>> GetRealmRolesInternalAsync(CancellationToken ct)
    {
        var client = await CreateAuthorizedClientAsync(ct);
        // Keycloak returns brief role representation by default, which can omit custom fields.
        // Force full representation so description and attributes are available for UI and filtering.
        var url = $"{_opts.AdminBaseUrl}/auth/admin/realms/{_opts.Realm}/roles?briefRepresentation=false&max=1000";
        return await client.GetFromJsonAsync<List<KcRole>>(url, ct) ?? [];
    }

    private async Task<KcRole> GetRealmRoleRepresentationAsync(string roleName, CancellationToken ct)
    {
        var client = await CreateAuthorizedClientAsync(ct);
        var rolePath = Uri.EscapeDataString(roleName);
        var url = $"{_opts.AdminBaseUrl}/auth/admin/realms/{_opts.Realm}/roles/{rolePath}";

        var response = await client.GetAsync(url, ct);
        if (response.StatusCode == System.Net.HttpStatusCode.NotFound)
            throw new KeyNotFoundException($"Role '{roleName}' was not found.");

        if (response.StatusCode == System.Net.HttpStatusCode.Forbidden)
            throw new UnauthorizedAccessException("Keycloak denied role read. Grant 'view-realm' to service account.");

        response.EnsureSuccessStatusCode();

        return await response.Content.ReadFromJsonAsync<KcRole>(cancellationToken: ct)
            ?? throw new InvalidOperationException($"Role '{roleName}' payload is empty.");
    }

    private static bool IsManagedRole(KcRole role)
    {
        if (role.Attributes is not null &&
            role.Attributes.TryGetValue(ManagedRoleAttributeKey, out var values) &&
            values.Any(v => string.Equals(v, ManagedRoleMarker, StringComparison.OrdinalIgnoreCase)))
        {
            return true;
        }

        if (IsManagedRoleDescription(role.Description))
            return true;

        return !IsSystemRoleName(role.Name);
    }

    private static bool IsManagedRoleDescription(string? description)
    {
        if (string.IsNullOrWhiteSpace(description))
            return false;

        var normalized = description.Trim();
        if (normalized.StartsWith("${role_", StringComparison.OrdinalIgnoreCase))
            return false;

        return true;
    }

    private static bool IsSystemRoleName(string roleName)
    {
        if (string.IsNullOrWhiteSpace(roleName))
            return true;

        return roleName.Equals("offline_access", StringComparison.OrdinalIgnoreCase)
            || roleName.Equals("uma_authorization", StringComparison.OrdinalIgnoreCase)
            || roleName.StartsWith("default-roles-", StringComparison.OrdinalIgnoreCase);
    }

    private static Dictionary<string, List<string>> ToKeycloakAttributes(
        IReadOnlyDictionary<string, IReadOnlyList<string>> attributes)
    {
        return attributes.ToDictionary(
            kv => kv.Key,
            kv => kv.Value.ToList(),
            StringComparer.Ordinal);
    }

    private static IReadOnlyDictionary<string, IReadOnlyList<string>> ToDomainAttributes(
        Dictionary<string, List<string>>? attributes)
    {
        if (attributes is null || attributes.Count == 0)
            return new Dictionary<string, IReadOnlyList<string>>();

        return attributes.ToDictionary(
            kv => kv.Key,
            kv => (IReadOnlyList<string>)kv.Value,
            StringComparer.Ordinal);
    }

    // ── Private models ────────────────────────────────────────────────────

    private sealed class KcUser
    {
        [JsonPropertyName("id")]        public string Id { get; set; } = string.Empty;
        [JsonPropertyName("username")]  public string Username { get; set; } = string.Empty;
        [JsonPropertyName("firstName")] public string? FirstName { get; set; }
        [JsonPropertyName("lastName")]  public string? LastName { get; set; }
        [JsonPropertyName("email")]     public string? Email { get; set; }
        [JsonPropertyName("enabled")]   public bool Enabled { get; set; }
    }

    private sealed class KcRole
    {
        [JsonPropertyName("id")]          public string Id { get; set; } = string.Empty;
        [JsonPropertyName("name")]        public string Name { get; set; } = string.Empty;
        [JsonPropertyName("description")] public string? Description { get; set; }
        [JsonPropertyName("attributes")]  public Dictionary<string, List<string>>? Attributes { get; set; }
    }
}

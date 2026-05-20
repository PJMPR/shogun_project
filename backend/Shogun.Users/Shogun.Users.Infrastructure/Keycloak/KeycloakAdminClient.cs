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
        var realmRoles = await GetRealmRolesAsync(ct);
        var toAssign = realmRoles.Where(r => roleNames.Contains(r.Name)).ToList();
        if (toAssign.Count == 0) return;

        var client = await CreateAuthorizedClientAsync(ct);
        var url = $"{_opts.AdminBaseUrl}/auth/admin/realms/{_opts.Realm}/users/{userId}/role-mappings/realm";
        var response = await client.PostAsJsonAsync(url, toAssign, ct);
        response.EnsureSuccessStatusCode();
    }

    public async Task RemoveRolesFromUserAsync(string userId, IReadOnlyList<string> roleNames, CancellationToken ct = default)
    {
        var realmRoles = await GetRealmRolesAsync(ct);
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

    private async Task<List<KcRole>> GetRealmRolesAsync(CancellationToken ct)
    {
        var client = await CreateAuthorizedClientAsync(ct);
        var url = $"{_opts.AdminBaseUrl}/auth/admin/realms/{_opts.Realm}/roles";
        return await client.GetFromJsonAsync<List<KcRole>>(url, ct) ?? [];
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
        [JsonPropertyName("id")]   public string Id { get; set; } = string.Empty;
        [JsonPropertyName("name")] public string Name { get; set; } = string.Empty;
    }
}

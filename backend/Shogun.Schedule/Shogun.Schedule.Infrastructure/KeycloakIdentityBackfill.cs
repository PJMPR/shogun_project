using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json.Serialization;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace Shogun.Schedule.Infrastructure;

public sealed class KeycloakIdentityBackfill(ScheduleDbContext db, IHttpClientFactory clients, IConfiguration configuration, ILogger<KeycloakIdentityBackfill> logger)
{
    public async Task RunAsync(CancellationToken ct = default)
    {
        try
        {
            var map = (await GetUsersAsync(ct))
                .Where(x => !string.IsNullOrWhiteSpace(x.Email))
                .GroupBy(x => x.Email!.Trim(), StringComparer.OrdinalIgnoreCase)
                .Where(x => x.Count() == 1)
                .ToDictionary(x => x.Key, x => x.Single().Id, StringComparer.OrdinalIgnoreCase);

            var changed = 0;
            foreach (var x in await db.ScheduleEntries.Where(x => x.LecturerUserId == null && x.LecturerEmail != null).ToListAsync(ct))
                if (map.TryGetValue(x.LecturerEmail!, out var id)) { x.LecturerUserId = id; changed++; }
            foreach (var x in await db.ScheduleComments.Where(x => x.AuthorUserId == null && x.AuthorEmail != null).ToListAsync(ct))
                if (map.TryGetValue(x.AuthorEmail!, out var id)) { x.AuthorUserId = id; changed++; }
            foreach (var x in await db.Schedules.Where(x => x.CreatedByUserId == null || x.UpdatedByUserId == null).ToListAsync(ct))
            {
                if (x.CreatedByUserId == null && x.CreatedBy != null && map.TryGetValue(x.CreatedBy, out var created)) { x.CreatedByUserId = created; changed++; }
                if (x.UpdatedByUserId == null && x.UpdatedBy != null && map.TryGetValue(x.UpdatedBy, out var updated)) { x.UpdatedByUserId = updated; changed++; }
            }
            foreach (var x in await db.StudentGroups.Where(x => x.CreatedByUserId == null || x.UpdatedByUserId == null).ToListAsync(ct))
            {
                if (x.CreatedByUserId == null && x.CreatedBy != null && map.TryGetValue(x.CreatedBy, out var created)) { x.CreatedByUserId = created; changed++; }
                if (x.UpdatedByUserId == null && x.UpdatedBy != null && map.TryGetValue(x.UpdatedBy, out var updated)) { x.UpdatedByUserId = updated; changed++; }
            }
            foreach (var x in await db.ScheduleEntries.Where(x => x.CreatedByUserId == null || x.UpdatedByUserId == null).ToListAsync(ct))
            {
                if (x.CreatedByUserId == null && x.CreatedBy != null && map.TryGetValue(x.CreatedBy, out var created)) { x.CreatedByUserId = created; changed++; }
                if (x.UpdatedByUserId == null && x.UpdatedBy != null && map.TryGetValue(x.UpdatedBy, out var updated)) { x.UpdatedByUserId = updated; changed++; }
            }
            await db.SaveChangesAsync(ct);
            logger.LogInformation("Uzupełniono {Changed} identyfikatorów Keycloak w danych planów.", changed);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Backfill userId planów zostanie ponowiony przy następnym starcie.");
        }
    }

    private async Task<List<KeycloakUser>> GetUsersAsync(CancellationToken ct)
    {
        var section = configuration.GetSection("Keycloak");
        var baseUrl = section["AdminBaseUrl"] ?? throw new InvalidOperationException("Keycloak:AdminBaseUrl is missing.");
        var realm = section["Realm"] ?? "shogun";
        var clientId = section["ClientId"] ?? throw new InvalidOperationException("Keycloak:ClientId is missing.");
        var clientSecret = section["ClientSecret"] ?? throw new InvalidOperationException("Keycloak:ClientSecret is missing.");
        var client = clients.CreateClient("keycloak-admin");
        var response = await client.PostAsync($"{baseUrl}/auth/realms/{realm}/protocol/openid-connect/token", new FormUrlEncodedContent(new Dictionary<string, string> { ["grant_type"] = "client_credentials", ["client_id"] = clientId, ["client_secret"] = clientSecret }), ct);
        response.EnsureSuccessStatusCode();
        var token = await response.Content.ReadFromJsonAsync<TokenResponse>(cancellationToken: ct) ?? throw new InvalidOperationException("Empty Keycloak token response.");
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token.AccessToken);
        return await client.GetFromJsonAsync<List<KeycloakUser>>($"{baseUrl}/auth/admin/realms/{realm}/users?max=1000", ct) ?? [];
    }

    private sealed record TokenResponse([property: JsonPropertyName("access_token")] string AccessToken);
    private sealed record KeycloakUser([property: JsonPropertyName("id")] string Id, [property: JsonPropertyName("email")] string? Email);
}

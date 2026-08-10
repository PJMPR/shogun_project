using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json.Serialization;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace Shogun.Assignments.Service.Api.Infrastructure.Persistence;

public sealed class LecturerIdentityBackfill(
    AssignmentsDbContext db,
    IHttpClientFactory clients,
    IConfiguration configuration,
    ILogger<LecturerIdentityBackfill> logger)
{
    public async Task RunAsync(CancellationToken ct = default)
    {
        await db.Database.ExecuteSqlRawAsync(
            "ALTER TABLE lecturer_assignments ADD COLUMN IF NOT EXISTS LecturerUserId varchar(100) NULL", ct);
        await db.Database.ExecuteSqlRawAsync(
            "ALTER TABLE lecturer_assignments MODIFY COLUMN LecturerEmail varchar(200) NULL", ct);
        await db.Database.ExecuteSqlRawAsync(
            "CREATE INDEX IF NOT EXISTS IX_lecturer_assignments_LecturerUserId ON lecturer_assignments (LecturerUserId)", ct);

        var pending = await db.LecturerAssignments
            .Where(x => x.LecturerUserId == null && x.LecturerEmail != null)
            .Select(x => x.LecturerEmail!)
            .Distinct()
            .ToListAsync(ct);
        if (pending.Count == 0) return;

        try
        {
            var users = await GetUsersAsync(ct);
            var uniqueByEmail = users
                .Where(x => !string.IsNullOrWhiteSpace(x.Email))
                .GroupBy(x => x.Email!.Trim(), StringComparer.OrdinalIgnoreCase)
                .Where(x => x.Count() == 1)
                .ToDictionary(x => x.Key, x => x.Single().Id, StringComparer.OrdinalIgnoreCase);

            var updated = 0;
            foreach (var assignment in await db.LecturerAssignments
                         .Where(x => x.LecturerUserId == null && x.LecturerEmail != null).ToListAsync(ct))
            {
                if (!uniqueByEmail.TryGetValue(assignment.LecturerEmail!, out var userId)) continue;
                assignment.LecturerUserId = userId;
                updated++;
            }
            await db.SaveChangesAsync(ct);
            logger.LogInformation("Uzupełniono Keycloak userId w {Updated} dezyderatach; {Unmatched} adresów pozostało bez jednoznacznego dopasowania.", updated, pending.Count(x => !uniqueByEmail.ContainsKey(x)));
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Backfill userId dezyderatów zostanie ponowiony przy następnym starcie.");
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
        var tokenResponse = await client.PostAsync($"{baseUrl}/auth/realms/{realm}/protocol/openid-connect/token",
            new FormUrlEncodedContent(new Dictionary<string, string> { ["grant_type"] = "client_credentials", ["client_id"] = clientId, ["client_secret"] = clientSecret }), ct);
        tokenResponse.EnsureSuccessStatusCode();
        var token = await tokenResponse.Content.ReadFromJsonAsync<TokenResponse>(cancellationToken: ct) ?? throw new InvalidOperationException("Empty Keycloak token response.");
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token.AccessToken);
        return await client.GetFromJsonAsync<List<KeycloakUser>>($"{baseUrl}/auth/admin/realms/{realm}/users?max=1000", ct) ?? [];
    }

    private sealed record TokenResponse([property: JsonPropertyName("access_token")] string AccessToken);
    private sealed record KeycloakUser([property: JsonPropertyName("id")] string Id, [property: JsonPropertyName("email")] string? Email);
}

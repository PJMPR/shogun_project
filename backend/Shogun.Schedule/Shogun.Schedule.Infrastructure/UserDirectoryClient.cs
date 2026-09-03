using System.Net.Http.Headers;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Http;
using Shogun.Schedule.Application;

namespace Shogun.Schedule.Infrastructure;

public sealed class UserDirectoryClient(HttpClient http, IHttpContextAccessor contextAccessor) : IUserDirectory
{
    public async Task<IReadOnlyList<DirectoryUser>> ResolveAsync(IReadOnlyList<string> userIds, CancellationToken ct)
    {
        using var request = new HttpRequestMessage(HttpMethod.Post, "/api/v1/user-directory/resolve")
        {
            Content = JsonContent.Create(new { userIds })
        };
        var authorization = contextAccessor.HttpContext?.Request.Headers.Authorization.ToString();
        if (!string.IsNullOrWhiteSpace(authorization)) request.Headers.Authorization = AuthenticationHeaderValue.Parse(authorization);
        using var response = await http.SendAsync(request, ct);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<List<DirectoryUser>>(cancellationToken: ct) ?? [];
    }
}

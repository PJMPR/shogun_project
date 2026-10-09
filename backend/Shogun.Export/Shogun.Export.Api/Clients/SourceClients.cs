using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json.Serialization;
using System.Text.Json;
using Shogun.Export.Api.Models;
using Shogun.Schedule.Application;
using Shogun.Schedule.Domain;

namespace Shogun.Export.Api.Clients;

public sealed class ForwardAuthorizationHandler(IHttpContextAccessor accessor) : DelegatingHandler
{
    protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct)
    {
        var value = accessor.HttpContext?.Request.Headers.Authorization.ToString();
        if (!string.IsNullOrWhiteSpace(value)) request.Headers.TryAddWithoutValidation("Authorization", value);
        return base.SendAsync(request, ct);
    }
}

public sealed class ScheduleSourceClient(HttpClient client)
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter(JsonNamingPolicy.CamelCase) }
    };

    public async Task<FacultyWorkloadDto> GetWorkloadAsync(ExportQuery query, CancellationToken ct)
    {
        using var response = await client.GetAsync($"api/v1/faculty/workload?academicYear={Uri.EscapeDataString(query.AcademicYear)}&facultyCode={Uri.EscapeDataString(query.FacultyCode)}&studyMode={query.StudyMode}", ct);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<FacultyWorkloadDto>(JsonOptions, ct) ?? throw new InvalidOperationException("API Kadry zwróciło pustą odpowiedź.");
    }
}

public sealed class ProgramDataSourceClient(HttpClient client)
{
    public async Task<IReadOnlyList<ExportSyllabus>> GetSyllabiAsync(ExportQuery query, FacultyWorkloadDto workload, CancellationToken ct)
    {
        var codes = workload.Subjects.Select(x => x.Code).Where(x => !string.IsNullOrWhiteSpace(x)).Distinct(StringComparer.OrdinalIgnoreCase).ToList();
        var result = new List<ExportSyllabus>();
        foreach (var code in codes)
        {
            var url = $"api/v1/syllabi?page=1&pageSize=1000&kod_przedmiotu={Uri.EscapeDataString(code!)}&tryb_studiow={(query.StudyMode == StudyMode.Stationary ? "stacjonarny" : "niestacjonarny")}";
            using var response = await client.GetAsync(url, ct);
            response.EnsureSuccessStatusCode();
            var page = await response.Content.ReadFromJsonAsync<SyllabusPage>(cancellationToken: ct) ?? throw new InvalidOperationException("API sylabusów zwróciło pustą odpowiedź.");
            result.AddRange(page.Items);
        }
        return result;
    }
    private sealed record SyllabusPage([property: JsonPropertyName("items")] IReadOnlyList<ExportSyllabus> Items);
}

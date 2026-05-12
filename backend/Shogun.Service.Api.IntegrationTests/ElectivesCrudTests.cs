using FluentAssertions;
using System.Net;
using System.Net.Http.Json;
using System.Text.Json.Nodes;

namespace Shogun.Service.Api.IntegrationTests;

public class ElectivesCrudTests : IClassFixture<SyllabiApiFactory>
{
    private readonly HttpClient _client;
    public ElectivesCrudTests(SyllabiApiFactory factory) => _client = factory.CreateClient();

    [Fact]
    public async Task Create_and_get_elective()
    {
        var payload = new { elective_type = "other", tryb_studiow = "stacjonarny", is_stary = false, lang = "pl", _source = (string?)null, data = (object?)null };
        var createResp = await _client.PostAsJsonAsync("/api/v1/electives", payload);
        createResp.StatusCode.Should().Be(HttpStatusCode.Created);

        var created = await createResp.Content.ReadFromJsonAsync<JsonObject>();
        var id = created!["id"]!.GetValue<string>();

        var getResp = await _client.GetAsync($"/api/v1/electives/{id}");
        getResp.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task Filter_by_elective_type()
    {
        await _client.PostAsJsonAsync("/api/v1/electives",
            new { elective_type = "other", tryb_studiow = "stacjonarny", is_stary = false, lang = "pl", _source = (string?)null, data = (object?)null });
        await _client.PostAsJsonAsync("/api/v1/electives",
            new { elective_type = "specializations", tryb_studiow = "stacjonarny", is_stary = false, lang = "pl", _source = (string?)null, data = (object?)null });

        var resp = await _client.GetAsync("/api/v1/electives?elective_type=other");
        var body = await resp.Content.ReadFromJsonAsync<JsonObject>();
        body!["items"]!.AsArray().Should().AllSatisfy(item =>
            item!["elective_type"]!.GetValue<string>().Should().Be("other"));
    }
}

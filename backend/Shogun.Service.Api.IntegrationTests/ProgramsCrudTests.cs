using FluentAssertions;
using System.Net;
using System.Net.Http.Json;
using System.Text.Json.Nodes;

namespace Shogun.Service.Api.IntegrationTests;

public class ProgramsCrudTests : IClassFixture<SyllabiApiFactory>
{
    private readonly HttpClient _client;
    public ProgramsCrudTests(SyllabiApiFactory factory) => _client = factory.CreateClient();

    [Fact]
    public async Task Create_and_get_program()
    {
        var payload = new { tryb_studiow = "stacjonarny", is_stary = false, lang = "pl", _source = (string?)null, data = (object?)null };
        var createResp = await _client.PostAsJsonAsync("/api/v1/programs", payload);
        createResp.StatusCode.Should().Be(HttpStatusCode.Created);

        var created = await createResp.Content.ReadFromJsonAsync<JsonObject>();
        var id = created!["id"]!.GetValue<string>();

        var getResp = await _client.GetAsync($"/api/v1/programs/{id}");
        getResp.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task Delete_program()
    {
        var payload = new { tryb_studiow = "niestacjonarny", is_stary = false, lang = "en", _source = (string?)null, data = (object?)null };
        var created = await (await _client.PostAsJsonAsync("/api/v1/programs", payload)).Content.ReadFromJsonAsync<JsonObject>();
        var id = created!["id"]!.GetValue<string>();

        var deleteResp = await _client.DeleteAsync($"/api/v1/programs/{id}");
        deleteResp.StatusCode.Should().Be(HttpStatusCode.NoContent);
    }
}

using FluentAssertions;
using System.Net;
using System.Net.Http.Json;
using System.Text.Json.Nodes;

namespace Shogun.Service.Api.IntegrationTests;

public class SyllabiCrudTests : IClassFixture<SyllabiApiFactory>
{
    private readonly HttpClient _client;

    public SyllabiCrudTests(SyllabiApiFactory factory)
        => _client = factory.CreateClient();

    [Fact]
    public async Task Get_list_returns_200_with_paged_result()
    {
        var response = await _client.GetAsync("/api/v1/syllabi");
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var body = await response.Content.ReadFromJsonAsync<JsonObject>();
        body.Should().NotBeNull();
        body!["totalCount"].Should().NotBeNull();
        body["items"].Should().NotBeNull();
    }

    [Fact]
    public async Task Create_returns_201_and_get_returns_same_document()
    {
        var createPayload = new
        {
            kod_przedmiotu = "TEST1",
            tryb_studiow = "stacjonarny",
            is_stary = false,
            _source = (string?)null,
            sylabus = new { nazwa_przedmiotu = "Test Subject", rok_studiow = 1 }
        };

        var createResponse = await _client.PostAsJsonAsync("/api/v1/syllabi", createPayload);
        createResponse.StatusCode.Should().Be(HttpStatusCode.Created);

        var created = await createResponse.Content.ReadFromJsonAsync<JsonObject>();
        var id = created!["id"]!.GetValue<string>();

        var getResponse = await _client.GetAsync($"/api/v1/syllabi/{id}");
        getResponse.StatusCode.Should().Be(HttpStatusCode.OK);

        var fetched = await getResponse.Content.ReadFromJsonAsync<JsonObject>();
        fetched!["kod_przedmiotu"]!.GetValue<string>().Should().Be("TEST1");
    }

    [Fact]
    public async Task Update_changes_document()
    {
        // Create
        var payload = new { kod_przedmiotu = "UPD1", tryb_studiow = "stacjonarny", is_stary = false, _source = (string?)null, sylabus = (object?)null };
        var createResp = await _client.PostAsJsonAsync("/api/v1/syllabi", payload);
        var created = await createResp.Content.ReadFromJsonAsync<JsonObject>();
        var id = created!["id"]!.GetValue<string>();

        // Update
        var updatePayload = new { kod_przedmiotu = "UPD1-UPDATED", tryb_studiow = "niestacjonarny", is_stary = true, _source = (string?)null, sylabus = (object?)null };
        var updateResp = await _client.PutAsJsonAsync($"/api/v1/syllabi/{id}", updatePayload);
        updateResp.StatusCode.Should().Be(HttpStatusCode.OK);

        var updated = await updateResp.Content.ReadFromJsonAsync<JsonObject>();
        updated!["kod_przedmiotu"]!.GetValue<string>().Should().Be("UPD1-UPDATED");
        updated["tryb_studiow"]!.GetValue<string>().Should().Be("niestacjonarny");
    }

    [Fact]
    public async Task Delete_returns_204_then_404()
    {
        // Create
        var payload = new { kod_przedmiotu = "DEL1", tryb_studiow = "stacjonarny", is_stary = false, _source = (string?)null, sylabus = (object?)null };
        var createResp = await _client.PostAsJsonAsync("/api/v1/syllabi", payload);
        var created = await createResp.Content.ReadFromJsonAsync<JsonObject>();
        var id = created!["id"]!.GetValue<string>();

        // Delete
        var deleteResp = await _client.DeleteAsync($"/api/v1/syllabi/{id}");
        deleteResp.StatusCode.Should().Be(HttpStatusCode.NoContent);

        // Verify 404
        var getResp = await _client.GetAsync($"/api/v1/syllabi/{id}");
        getResp.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Filter_by_tryb_studiow_returns_only_matching()
    {
        // Seed
        await _client.PostAsJsonAsync("/api/v1/syllabi",
            new { kod_przedmiotu = "FILT1", tryb_studiow = "stacjonarny", is_stary = false, _source = (string?)null, sylabus = (object?)null });
        await _client.PostAsJsonAsync("/api/v1/syllabi",
            new { kod_przedmiotu = "FILT2", tryb_studiow = "niestacjonarny", is_stary = false, _source = (string?)null, sylabus = (object?)null });

        var resp = await _client.GetAsync("/api/v1/syllabi?tryb_studiow=stacjonarny");
        var body = await resp.Content.ReadFromJsonAsync<JsonObject>();
        var items = body!["items"]!.AsArray();

        items.Should().AllSatisfy(item =>
            item!["tryb_studiow"]!.GetValue<string>().Should().Be("stacjonarny"));
    }

    [Fact]
    public async Task Pagination_works()
    {
        // Seed 3 docs
        for (int i = 0; i < 3; i++)
            await _client.PostAsJsonAsync("/api/v1/syllabi",
                new { kod_przedmiotu = $"PAG{i}", tryb_studiow = "stacjonarny", is_stary = false, _source = (string?)null, sylabus = (object?)null });

        var resp = await _client.GetAsync("/api/v1/syllabi?page=1&pageSize=2");
        var body = await resp.Content.ReadFromJsonAsync<JsonObject>();
        body!["items"]!.AsArray().Count.Should().BeLessThanOrEqualTo(2);
    }

    [Fact]
    public async Task Create_with_invalid_tryb_studiow_returns_400()
    {
        var payload = new { kod_przedmiotu = "BAD1", tryb_studiow = "wieczorowy", is_stary = false, _source = (string?)null, sylabus = (object?)null };
        var resp = await _client.PostAsJsonAsync("/api/v1/syllabi", payload);
        resp.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }
}

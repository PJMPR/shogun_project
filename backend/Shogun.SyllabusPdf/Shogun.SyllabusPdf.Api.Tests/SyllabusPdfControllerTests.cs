using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using Shogun.SyllabusPdf.Api.Controllers;
using Shogun.SyllabusPdf.Api.Generation;
using Xunit;

namespace Shogun.SyllabusPdf.Api.Tests;

public sealed class SyllabusPdfControllerTests
{
    [Fact]
    public async Task Generate_ReturnsPdfWithSubjectCodeAsFileName()
    {
        var expectedPdf = "%PDF-test"u8.ToArray();
        var generator = new StubGenerator(expectedPdf);
        var controller = new SyllabusPdfController(generator);
        using var document = JsonDocument.Parse("""
            { "sylabus": { "kod_przedmiotu": "ASD" } }
            """);

        var response = await controller.Generate(document.RootElement, CancellationToken.None);

        var file = Assert.IsType<FileContentResult>(response);
        Assert.Equal("application/pdf", file.ContentType);
        Assert.Equal("ASD.pdf", file.FileDownloadName);
        Assert.Equal(expectedPdf, file.FileContents);
        Assert.Equal(1, generator.CallCount);
    }

    [Theory]
    [InlineData("{}")]
    [InlineData("{ \"sylabus\": {} }")]
    [InlineData("{ \"sylabus\": { \"kod_przedmiotu\": \" \" } }")]
    public async Task Generate_ReturnsValidationProblemForInvalidContract(string json)
    {
        var generator = new StubGenerator([]);
        var controller = new SyllabusPdfController(generator);
        using var document = JsonDocument.Parse(json);

        var response = await controller.Generate(document.RootElement, CancellationToken.None);

        var problem = Assert.IsAssignableFrom<ObjectResult>(response);
        Assert.Equal(400, problem.StatusCode);
        Assert.Equal(0, generator.CallCount);
    }

    private sealed class StubGenerator(byte[] result) : ISyllabusPdfGenerator
    {
        public int CallCount { get; private set; }

        public Task<byte[]> GenerateAsync(JsonElement document, CancellationToken cancellationToken)
        {
            CallCount++;
            return Task.FromResult(result);
        }
    }
}

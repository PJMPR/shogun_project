using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using Shogun.SyllabusPdf.Api.Generation;

namespace Shogun.SyllabusPdf.Api.Controllers;

[ApiController]
[Route("api/v1/syllabi/pdf")]
public sealed class SyllabusPdfController(ISyllabusPdfGenerator generator) : ControllerBase
{
    [HttpPost]
    [Consumes("application/json")]
    [Produces("application/pdf")]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status422UnprocessableEntity)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status503ServiceUnavailable)]
    public async Task<IActionResult> Generate([FromBody] JsonElement document, CancellationToken cancellationToken)
    {
        if (document.ValueKind != JsonValueKind.Object ||
            !document.TryGetProperty("sylabus", out var syllabus) ||
            syllabus.ValueKind != JsonValueKind.Object)
        {
            return ValidationProblem(new ValidationProblemDetails(new Dictionary<string, string[]>
            {
                ["sylabus"] = ["Dokument JSON musi zawierac obiekt 'sylabus'."]
            }));
        }

        if (!syllabus.TryGetProperty("kod_przedmiotu", out var codeElement) ||
            codeElement.ValueKind != JsonValueKind.String ||
            string.IsNullOrWhiteSpace(codeElement.GetString()))
        {
            return ValidationProblem(new ValidationProblemDetails(new Dictionary<string, string[]>
            {
                ["sylabus.kod_przedmiotu"] = ["Pole jest wymagane."]
            }));
        }

        var result = await generator.GenerateAsync(document, cancellationToken);
        var downloadName = SanitizeFileName(codeElement.GetString()!) + ".pdf";
        return File(result, "application/pdf", downloadName);
    }

    private static string SanitizeFileName(string value)
    {
        var invalid = Path.GetInvalidFileNameChars();
        var safe = new string(value.Trim().Where(character => !invalid.Contains(character)).ToArray());
        return string.IsNullOrWhiteSpace(safe) ? "syllabus" : safe;
    }
}

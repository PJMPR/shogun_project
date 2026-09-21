using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using Shogun.SyllabusPdf.Api.Generation;

namespace Shogun.SyllabusPdf.Api.Middleware;

public sealed class GlobalExceptionHandler(
    IProblemDetailsService problemDetailsService,
    ILogger<GlobalExceptionHandler> logger) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(
        HttpContext httpContext,
        Exception exception,
        CancellationToken cancellationToken)
    {
        var (status, title, detail) = exception switch
        {
            PdfGenerationException generationException => (
                StatusCodes.Status422UnprocessableEntity,
                "Nie mozna wygenerowac PDF.",
                generationException.Details),
            PdfGenerationTimeoutException => (
                StatusCodes.Status503ServiceUnavailable,
                "Generator PDF przekroczyl limit czasu.",
                exception.Message),
            _ => (
                StatusCodes.Status500InternalServerError,
                "Wystapil wewnetrzny blad serwera.",
                (string?)null)
        };

        logger.LogError(exception, "PDF request failed with status code {StatusCode}", status);
        httpContext.Response.StatusCode = status;
        return await problemDetailsService.TryWriteAsync(new ProblemDetailsContext
        {
            HttpContext = httpContext,
            ProblemDetails = new ProblemDetails
            {
                Status = status,
                Title = title,
                Detail = detail
            },
            Exception = exception
        });
    }
}

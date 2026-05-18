using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using MongoDB.Driver;

namespace Shogun.Service.Api.Middleware;

/// <summary>
/// Global exception handler that maps exceptions to RFC 7807 ProblemDetails.
/// </summary>
public class GlobalExceptionHandler : IExceptionHandler
{
    private readonly ILogger<GlobalExceptionHandler> _logger;

    public GlobalExceptionHandler(ILogger<GlobalExceptionHandler> logger)
        => _logger = logger;

    public async ValueTask<bool> TryHandleAsync(
        HttpContext httpContext,
        Exception exception,
        CancellationToken cancellationToken)
    {
        _logger.LogError(exception, "Unhandled exception: {Message}", exception.Message);

        var (status, title) = exception switch
        {
            FormatException           => (StatusCodes.Status400BadRequest, "Invalid format"),
            MongoException            => (StatusCodes.Status503ServiceUnavailable, "Database error"),
            OperationCanceledException=> (StatusCodes.Status408RequestTimeout, "Request cancelled"),
            _                         => (StatusCodes.Status500InternalServerError, "Internal server error"),
        };

        var problem = new ProblemDetails
        {
            Status = status,
            Title = title,
            Detail = exception.Message,
            Instance = httpContext.Request.Path,
        };

        httpContext.Response.StatusCode = status;
        await httpContext.Response.WriteAsJsonAsync(problem, cancellationToken);
        return true;
    }
}

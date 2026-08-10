using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using Shogun.Schedule.Application;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace Shogun.Schedule.Api;

public sealed class ApiExceptionHandler(IProblemDetailsService problems) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(HttpContext context, Exception exception, CancellationToken ct)
    {
        var (status, title) = exception switch
        {
            NotFoundException => (404, "Nie znaleziono zasobu"), ConflictException => (409, "Konflikt wersji lub danych"),
            ValidationException => (422, "Nie można wykonać operacji"), UnauthorizedAccessException => (403, "Brak uprawnień"),
            DbUpdateConcurrencyException => (409, "Konflikt wersji danych"), DbUpdateException => (409, "Konflikt danych"),
            _ => (500, "Wewnętrzny błąd serwera"),
        };
        context.Response.StatusCode = status;
        var problem = new ProblemDetails
        {
            Status = status,
            Title = title,
            Detail = exception.Message,
        };
        problem.Extensions["exceptionType"] = exception.GetType().FullName;
        problem.Extensions["stackTrace"] = exception.ToString();
        return await problems.TryWriteAsync(new ProblemDetailsContext { HttpContext = context, ProblemDetails = problem });
    }
}

public static class ClaimsPrincipalExtensions
{
    public static CurrentUser ToCurrentUser(this ClaimsPrincipal principal)
    {
        var userId = principal.FindFirstValue("sub") ?? principal.FindFirstValue(ClaimTypes.NameIdentifier) ?? throw new UnauthorizedAccessException("Token nie zawiera identyfikatora użytkownika.");
        var email = principal.FindFirstValue(ClaimTypes.Email) ?? principal.FindFirstValue("email");
        var first = principal.FindFirstValue(ClaimTypes.GivenName) ?? principal.FindFirstValue("given_name") ?? "";
        var last = principal.FindFirstValue(ClaimTypes.Surname) ?? principal.FindFirstValue("family_name") ?? "";
        var name = principal.FindFirstValue("name") ?? $"{first} {last}".Trim(); if (string.IsNullOrWhiteSpace(name)) name = email ?? principal.FindFirstValue("preferred_username") ?? userId;
        var role = principal.IsInRole("admin") ? "admin" : principal.IsInRole("planner") ? "planner" : "lecturer";
        return new CurrentUser(userId, email?.Trim().ToLowerInvariant(), name, principal.IsInRole("admin"), role);
    }
}

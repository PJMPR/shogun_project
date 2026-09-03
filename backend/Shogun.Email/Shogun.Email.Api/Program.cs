using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.Extensions.Options;
using Shogun.Email.Api;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddProblemDetails();
builder.Services.AddHealthChecks();
builder.Services.AddOptions<SmtpOptions>()
    .Bind(builder.Configuration.GetSection(SmtpOptions.SectionName))
    .ValidateDataAnnotations()
    .ValidateOnStart();
builder.Services.AddOptions<ApiSecurityOptions>()
    .Bind(builder.Configuration.GetSection(ApiSecurityOptions.SectionName))
    .Validate(options => !string.IsNullOrWhiteSpace(options.ApiKey), "InternalApiKey:ApiKey is required.")
    .ValidateOnStart();
builder.Services.Configure<FormOptions>(options => options.MultipartBodyLengthLimit = 1_048_576);
builder.WebHost.ConfigureKestrel(options => options.Limits.MaxRequestBodySize = 1_048_576);
builder.Services.AddSingleton<IEmailSender, GmailSmtpEmailSender>();
builder.Services.AddSingleton<IEmailTemplateRenderer, EmailTemplateRenderer>();

var app = builder.Build();
app.UseExceptionHandler();
app.UseMiddleware<InternalApiKeyMiddleware>();
app.MapPost("/api/emails", EmailEndpoints.SendAsync);
app.MapHealthChecks("/health").AllowAnonymous();
app.Run();

public partial class Program;

internal sealed class InternalApiKeyMiddleware(RequestDelegate next, IOptions<ApiSecurityOptions> options)
{
    public async Task InvokeAsync(HttpContext context)
    {
        if (context.Request.Path.Equals("/health", StringComparison.OrdinalIgnoreCase))
        {
            await next(context);
            return;
        }

        var supplied = context.Request.Headers["X-Internal-Api-Key"].ToString();
        var expected = options.Value.ApiKey;
        var valid = supplied.Length == expected.Length && CryptographicOperations.FixedTimeEquals(
            Encoding.UTF8.GetBytes(supplied), Encoding.UTF8.GetBytes(expected));

        if (!valid)
        {
            context.Response.StatusCode = StatusCodes.Status401Unauthorized;
            await context.Response.WriteAsJsonAsync(new { error = "Nieprawidłowy klucz API." });
            return;
        }

        await next(context);
    }
}

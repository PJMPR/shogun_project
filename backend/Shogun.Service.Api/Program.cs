using Scalar.AspNetCore;
using Serilog;
using Shogun.Service.Api.Middleware;
using Shogun.Service.Api.Application;
using Shogun.Service.Api.Infrastructure;

var builder = WebApplication.CreateBuilder(args);

// Serilog — single-stage setup; avoids ReloadableLogger.Freeze() conflicts in WebApplicationFactory
builder.Host.UseSerilog((ctx, services, cfg) =>
    cfg.ReadFrom.Configuration(ctx.Configuration)
       .ReadFrom.Services(services)
       .Enrich.FromLogContext()
       .WriteTo.Console()
       .WriteTo.File("logs/api-.log", rollingInterval: RollingInterval.Day));

// ── Services ─────────────────────────────────────────────────────────────
builder.Services.AddControllers()
    .AddJsonOptions(opts =>
    {
        opts.JsonSerializerOptions.PropertyNamingPolicy = null; // preserve field names
    });

builder.Services.AddOpenApi();
builder.Services.AddExceptionHandler<GlobalExceptionHandler>();
builder.Services.AddProblemDetails();

builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration);

builder.Services.AddHealthChecks()
    .AddCheck("self", () => Microsoft.Extensions.Diagnostics.HealthChecks.HealthCheckResult.Healthy());

// ── Build ─────────────────────────────────────────────────────────────────
var app = builder.Build();

app.UseExceptionHandler();
app.UseSerilogRequestLogging();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.MapScalarApiReference(opts =>
    {
        opts.Title = "Shogun Syllabi Service API";
        opts.WithDefaultHttpClient(ScalarTarget.CSharp, ScalarClient.HttpClient);
    });
}

app.MapControllers();
app.MapHealthChecks("/health");

app.Run();

// Needed for integration tests
public partial class Program { }

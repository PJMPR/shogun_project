using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Scalar.AspNetCore;
using Serilog;
using Shogun.Assignments.Service.Api.Application;
using Shogun.Assignments.Service.Api.Infrastructure;
using Shogun.Assignments.Service.Api.Infrastructure.Persistence;
using Shogun.Assignments.Service.Api.Middleware;
using System.Security.Claims;
using System.Text.Json;

var builder = WebApplication.CreateBuilder(args);

builder.Host.UseSerilog((ctx, services, cfg) =>
    cfg.ReadFrom.Configuration(ctx.Configuration)
       .ReadFrom.Services(services)
       .Enrich.FromLogContext()
       .WriteTo.Console()
       .WriteTo.File("logs/assignments-api-.log", rollingInterval: RollingInterval.Day));

// ── Services ──────────────────────────────────────────────────────────────
builder.Services.AddControllers()
    .AddJsonOptions(opts =>
    {
        opts.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
        opts.JsonSerializerOptions.DictionaryKeyPolicy  = System.Text.Json.JsonNamingPolicy.CamelCase;
        opts.JsonSerializerOptions.DefaultIgnoreCondition =
            System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull;
    });

builder.Services.AddOpenApi();
builder.Services.AddExceptionHandler<GlobalExceptionHandler>();
builder.Services.AddProblemDetails();

builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration);

// ── Keycloak JWT Bearer auth ──────────────────────────────────────────────
var kcSection = builder.Configuration.GetSection("Keycloak");
builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.MetadataAddress = kcSection["MetadataAddress"]!;
        options.RequireHttpsMetadata = false;
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuers = kcSection.GetSection("ValidIssuers").Get<string[]>(),
            ValidateAudience = false,
        };
        options.Events = new JwtBearerEvents
        {
            OnTokenValidated = context =>
            {
                var principal = context.Principal;
                if (principal is null) return Task.CompletedTask;

                var realmAccess = principal.FindFirst("realm_access")?.Value;
                if (realmAccess is null) return Task.CompletedTask;

                using var doc = JsonDocument.Parse(realmAccess);
                if (!doc.RootElement.TryGetProperty("roles", out var rolesElement)) return Task.CompletedTask;

                var identity = (ClaimsIdentity)principal.Identity!;
                foreach (var role in rolesElement.EnumerateArray())
                {
                    var roleName = role.GetString();
                    if (!string.IsNullOrEmpty(roleName))
                        identity.AddClaim(new Claim(ClaimTypes.Role, roleName));
                }

                return Task.CompletedTask;
            },
        };
    });
builder.Services.AddAuthorization(opts =>
{
    opts.AddPolicy("AssignmentsAccess", policy =>
        policy.RequireAssertion(ctx => HasProjectAccess(ctx.User, "obsady")));
});

builder.Services.AddHealthChecks()
    .AddCheck("self", () => Microsoft.Extensions.Diagnostics.HealthChecks.HealthCheckResult.Healthy());

builder.Services.AddCors(options =>
    options.AddDefaultPolicy(policy =>
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader()));

// ── Build ─────────────────────────────────────────────────────────────────
var app = builder.Build();

// Auto-create schema on startup (no separate migration step required)
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AssignmentsDbContext>();
    await db.Database.EnsureCreatedAsync();
}

app.UseExceptionHandler();
app.UseCors();
app.UseAuthentication();
app.UseAuthorization();
app.UseSerilogRequestLogging();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.MapScalarApiReference(opts =>
    {
        opts.Title = "Shogun Assignments Service API";
        opts.WithDefaultHttpClient(ScalarTarget.CSharp, ScalarClient.HttpClient);
    });
}

app.MapControllers().RequireAuthorization();
app.MapHealthChecks("/health");

static bool HasProjectAccess(ClaimsPrincipal user, string project)
{
    if (user.IsInRole("admin"))
        return true;

    var wanted = project.Trim().ToLowerInvariant();

    foreach (var claim in user.FindAll("projects"))
    {
        var value = (claim.Value ?? string.Empty).Trim();
        if (string.IsNullOrWhiteSpace(value))
            continue;

        if (value.StartsWith("[") && value.EndsWith("]"))
        {
            try
            {
                var items = JsonSerializer.Deserialize<string[]>(value) ?? [];
                if (items.Any(i => string.Equals(i?.Trim(), wanted, StringComparison.OrdinalIgnoreCase)))
                    return true;
                continue;
            }
            catch
            {
            }
        }

        var parts = value.Split([',', ';'], StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        if (parts.Any(p => string.Equals(p, wanted, StringComparison.OrdinalIgnoreCase)))
            return true;
    }

    return false;
}

app.Run();

using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Serilog;
using Shogun.Schedule.Api;
using Shogun.Schedule.Infrastructure;
using System.Security.Claims;
using System.Text.Json;

var builder = WebApplication.CreateBuilder(args);
builder.Host.UseSerilog((ctx, services, cfg) => cfg.ReadFrom.Configuration(ctx.Configuration).ReadFrom.Services(services).Enrich.FromLogContext().WriteTo.Console());
builder.Services.AddControllers().AddJsonOptions(o => { o.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase; o.JsonSerializerOptions.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter(JsonNamingPolicy.CamelCase)); });
builder.Services.AddProblemDetails(); builder.Services.AddExceptionHandler<ApiExceptionHandler>();
builder.Services.AddScheduleInfrastructure(builder.Configuration);
var kc = builder.Configuration.GetSection("Keycloak");
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme).AddJwtBearer(o =>
{
    o.MetadataAddress = kc["MetadataAddress"]!; o.RequireHttpsMetadata = false;
    o.TokenValidationParameters = new TokenValidationParameters { ValidateIssuer = true, ValidIssuers = kc.GetSection("ValidIssuers").Get<string[]>(), ValidateAudience = false };
    o.Events = new JwtBearerEvents { OnTokenValidated = context => { var value = context.Principal?.FindFirst("realm_access")?.Value; if (value is null) return Task.CompletedTask; using var doc = JsonDocument.Parse(value); if (!doc.RootElement.TryGetProperty("roles", out var roles)) return Task.CompletedTask; var identity = (ClaimsIdentity)context.Principal!.Identity!; foreach (var role in roles.EnumerateArray()) if (role.GetString() is { Length: > 0 } name) identity.AddClaim(new Claim(ClaimTypes.Role, name)); return Task.CompletedTask; } };
});
builder.Services.AddAuthorization(); builder.Services.AddHealthChecks().AddCheck("self", () => Microsoft.Extensions.Diagnostics.HealthChecks.HealthCheckResult.Healthy());
builder.Services.AddCors(o => o.AddDefaultPolicy(p => p.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader()));
var app = builder.Build();
await MigrateWithRetry(app.Services, app.Logger);
app.UseExceptionHandler(); app.UseCors(); app.UseAuthentication(); app.UseAuthorization(); app.UseSerilogRequestLogging();
app.MapControllers().RequireAuthorization(); app.MapHealthChecks("/health"); app.Run();

static async Task MigrateWithRetry(IServiceProvider services, Microsoft.Extensions.Logging.ILogger logger)
{
    for (var attempt = 1; attempt <= 10; attempt++)
    {
        try { using var scope = services.CreateScope(); await scope.ServiceProvider.GetRequiredService<ScheduleDbContext>().Database.MigrateAsync(); return; }
        catch (Exception ex) when (attempt < 10) { logger.LogWarning(ex, "Migracja bazy nie powiodła się (próba {Attempt}/10).", attempt); await Task.Delay(TimeSpan.FromSeconds(Math.Min(3 * attempt, 15))); }
    }
}

public partial class Program;

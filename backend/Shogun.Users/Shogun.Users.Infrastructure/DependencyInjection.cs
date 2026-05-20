using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Shogun.Users.Domain.Repositories;
using Shogun.Users.Infrastructure.Data;
using Shogun.Users.Infrastructure.Keycloak;
using Shogun.Users.Infrastructure.Repositories;

namespace Shogun.Users.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        // ── MariaDB ───────────────────────────────────────────────────────
        var connectionString = Environment.GetEnvironmentVariable("MARIADB__CONNECTIONSTRING")
            ?? configuration.GetConnectionString("MariaDb")
            ?? throw new InvalidOperationException("MariaDB connection string is not configured.");

        var serverVersion = ServerVersion.AutoDetect(connectionString);

        services.AddDbContext<UsersDbContext>(opts =>
            opts.UseMySql(connectionString, serverVersion, mySql =>
                mySql.MigrationsAssembly(typeof(UsersDbContext).Assembly.FullName)));

        services.AddScoped<IAuditLogRepository, AuditLogRepository>();

        // ── Keycloak Admin Client ─────────────────────────────────────────
        services.Configure<KeycloakAdminOptions>(configuration.GetSection("Keycloak"));
        services.AddHttpClient("keycloak-admin");
        services.AddScoped<IKeycloakAdminPort, KeycloakAdminClient>();

        return services;
    }
}

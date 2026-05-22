using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Shogun.Users.Domain.Repositories;
using Shogun.Users.Infrastructure.Keycloak;

namespace Shogun.Users.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        // ── Keycloak Admin Client ─────────────────────────────────────────
        services.Configure<KeycloakAdminOptions>(configuration.GetSection("Keycloak"));
        services.AddHttpClient("keycloak-admin");
        services.AddScoped<IKeycloakAdminPort, KeycloakAdminClient>();

        return services;
    }
}

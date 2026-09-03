using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Shogun.Schedule.Application;

namespace Shogun.Schedule.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddScheduleInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        var connection = configuration["Postgres:ConnectionString"] ?? throw new InvalidOperationException("Brak Postgres:ConnectionString.");
        services.AddDbContext<ScheduleDbContext>(o => o.UseNpgsql(connection));
        services.AddScoped<IScheduleRepository, ScheduleRepository>();
        services.AddScoped<IScheduleService, ScheduleService>();
        services.AddHttpContextAccessor();
        services.AddHttpClient<IUserDirectory, UserDirectoryClient>(client => client.BaseAddress = new Uri(configuration["UsersApiBaseUrl"] ?? "http://pj_users_api:8080"));
        services.AddHttpClient<IMentionNotifier, EmailMentionNotifier>(client =>
        {
            client.BaseAddress = new Uri(configuration["EmailApi:BaseUrl"] ?? "http://pj_email_api:8080");
            client.Timeout = TimeSpan.FromSeconds(20);
        });
        services.AddScoped<KeycloakIdentityBackfill>();
        services.AddHttpClient("keycloak-admin");
        return services;
    }
}

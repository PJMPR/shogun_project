using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Shogun.Assignments.Service.Api.Domain.Repositories;
using Shogun.Assignments.Service.Api.Infrastructure.Persistence;
using Shogun.Assignments.Service.Api.Infrastructure.Repositories;

namespace Shogun.Assignments.Service.Api.Infrastructure;

public static class InfrastructureServiceCollectionExtensions
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = Environment.GetEnvironmentVariable("MARIADB__CONNECTIONSTRING")
            ?? configuration.GetConnectionString("MariaDb")
            ?? throw new InvalidOperationException("MariaDB connection string is not configured.");

        var serverVersion = ServerVersion.AutoDetect(connectionString);

        services.AddDbContext<AssignmentsDbContext>(opts =>
            opts.UseMySql(connectionString, serverVersion, mySql =>
                mySql.MigrationsAssembly(typeof(AssignmentsDbContext).Assembly.FullName)));

        services.AddScoped<ILecturerAssignmentRepository, LecturerAssignmentRepository>();
        services.AddScoped<LecturerIdentityBackfill>();
        services.AddHttpClient("keycloak-admin");

        return services;
    }
}

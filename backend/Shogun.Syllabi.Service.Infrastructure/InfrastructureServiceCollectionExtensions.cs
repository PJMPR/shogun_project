using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Shogun.Syllabi.Service.Domain.Repositories;
using Shogun.Syllabi.Service.Infrastructure.Persistence;
using Shogun.Syllabi.Service.Infrastructure.Repositories;

namespace Shogun.Syllabi.Service.Infrastructure;

public static class InfrastructureServiceCollectionExtensions
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        services.Configure<MongoDbSettings>(configuration.GetSection("MongoDB"));

        // Override with env vars if present
        services.PostConfigure<MongoDbSettings>(settings =>
        {
            var connStr = Environment.GetEnvironmentVariable("MONGODB__CONNECTIONSTRING");
            var dbName  = Environment.GetEnvironmentVariable("MONGODB__DATABASENAME");
            if (!string.IsNullOrWhiteSpace(connStr)) settings.ConnectionString = connStr;
            if (!string.IsNullOrWhiteSpace(dbName))  settings.DatabaseName     = dbName;
        });

        services.AddSingleton<MongoDbContext>();
        services.AddScoped<ISyllabiRepository, SyllabiRepository>();
        services.AddScoped<IProgramsRepository, ProgramsRepository>();
        services.AddScoped<IElectivesRepository, ElectivesRepository>();

        return services;
    }
}

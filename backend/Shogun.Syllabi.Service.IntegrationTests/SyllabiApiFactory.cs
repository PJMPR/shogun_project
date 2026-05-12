using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Options;
using Shogun.Syllabi.Service.Infrastructure.Persistence;
using Testcontainers.MongoDb;

namespace Shogun.Syllabi.Service.IntegrationTests;

/// <summary>
/// Shared MongoDB Testcontainer fixture (one container per test run).
/// </summary>
public class MongoFixture : IAsyncLifetime
{
    private readonly MongoDbContainer _container = new MongoDbBuilder()
        .WithImage("mongo:7")
        .Build();

    public string ConnectionString => _container.GetConnectionString();

    public Task InitializeAsync() => _container.StartAsync();
    public Task DisposeAsync()    => _container.StopAsync();
}

/// <summary>
/// WebApplicationFactory that replaces MongoDB settings with the Testcontainer.
/// </summary>
public class SyllabiApiFactory : WebApplicationFactory<Program>, IAsyncLifetime
{
    private readonly MongoFixture _mongo = new();

    public async Task InitializeAsync() => await _mongo.InitializeAsync();
    public new async Task DisposeAsync()
    {
        await _mongo.DisposeAsync();
        await base.DisposeAsync();
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.ConfigureServices(services =>
        {
            // Override MongoDbSettings to point at Testcontainer
            services.RemoveAll<IOptions<MongoDbSettings>>();
            services.Configure<MongoDbSettings>(opts =>
            {
                opts.ConnectionString = _mongo.ConnectionString;
                opts.DatabaseName = "pj_sylabi_test";
            });

            // Replace singleton MongoDbContext so it uses the new settings
            services.RemoveAll<MongoDbContext>();
            services.AddSingleton<MongoDbContext>();
        });
    }
}

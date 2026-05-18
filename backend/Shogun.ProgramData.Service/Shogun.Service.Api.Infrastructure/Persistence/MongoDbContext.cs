using Microsoft.Extensions.Options;
using MongoDB.Driver;
using Shogun.Service.Api.Domain.Entities;
using Shogun.Service.Api.Infrastructure.Persistence;

namespace Shogun.Service.Api.Infrastructure.Persistence;

public class MongoDbContext
{
    private readonly IMongoDatabase _database;

    public MongoDbContext(IOptions<MongoDbSettings> settings)
    {
        var client = new MongoClient(settings.Value.ConnectionString);
        _database = client.GetDatabase(settings.Value.DatabaseName);
    }

    public IMongoCollection<Syllabus> Syllabi => _database.GetCollection<Syllabus>("syllabi");
    public IMongoCollection<Domain.Entities.Program> Programs => _database.GetCollection<Domain.Entities.Program>("programs");
    public IMongoCollection<Elective> Electives => _database.GetCollection<Elective>("electives");
}

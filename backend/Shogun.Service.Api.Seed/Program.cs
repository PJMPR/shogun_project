using Microsoft.Extensions.Configuration;
using MongoDB.Bson;
using MongoDB.Driver;
using Serilog;
using System.Text.Json;

Log.Logger = new LoggerConfiguration()
    .WriteTo.Console()
    .CreateLogger();

var config = new ConfigurationBuilder()
    .AddJsonFile("appsettings.json", optional: true)
    .AddEnvironmentVariables()
    .Build();

var connectionString = config["MONGODB__CONNECTIONSTRING"]
    ?? config["MongoDB:ConnectionString"]
    ?? "mongodb://localhost:27017";
var databaseName = config["MONGODB__DATABASENAME"]
    ?? config["MongoDB:DatabaseName"]
    ?? "pj_sylabi";

Log.Information("Connecting to MongoDB: {Db} @ {ConnStr}", databaseName, connectionString);

var client = new MongoClient(connectionString);
var db = client.GetDatabase(databaseName);

// ── Create indexes ────────────────────────────────────────────────────────────
await CreateSyllabiIndexes(db);
await CreateProgramsIndexes(db);
await CreateElectivesIndexes(db);

Log.Information("Indexes created. Starting seed...");

// ── Seed from JSON files (paths relative to repo root via arg or env) ─────────
var repoRoot = args.Length > 0 ? args[0]
    : config["REPO_ROOT"]
    ?? Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "../../../../../.."));

Log.Information("Repo root: {Root}", repoRoot);

var syllabusCount   = await SeedSyllabi(db, repoRoot);
var programCount    = await SeedPrograms(db, repoRoot);
var electiveCount   = await SeedElectives(db, repoRoot);

Log.Information("Seed complete. syllabi={s}, programs={p}, electives={e}",
    syllabusCount, programCount, electiveCount);

// ─────────────────────────────────────────────────────────────────────────────
// Index helpers
// ─────────────────────────────────────────────────────────────────────────────

static async Task CreateSyllabiIndexes(IMongoDatabase db)
{
    var col = db.GetCollection<BsonDocument>("syllabi");
    var keys = Builders<BsonDocument>.IndexKeys;

    await col.Indexes.CreateManyAsync(new[]
    {
        new CreateIndexModel<BsonDocument>(keys.Ascending("kod_przedmiotu")),
        new CreateIndexModel<BsonDocument>(
            keys.Ascending("tryb_studiow").Ascending("is_stary")),
        new CreateIndexModel<BsonDocument>(
            keys.Ascending("sylabus.rok_studiow")),
    });
    Log.Information("syllabi indexes created");
}

static async Task CreateProgramsIndexes(IMongoDatabase db)
{
    var col = db.GetCollection<BsonDocument>("programs");
    var keys = Builders<BsonDocument>.IndexKeys;

    await col.Indexes.CreateManyAsync(new[]
    {
        new CreateIndexModel<BsonDocument>(
            keys.Ascending("tryb_studiow").Ascending("is_stary").Ascending("lang"),
            new CreateIndexOptions { Unique = true }),
        new CreateIndexModel<BsonDocument>(
            keys.Ascending("semesters.subjects.code")),
    });
    Log.Information("programs indexes created");
}

static async Task CreateElectivesIndexes(IMongoDatabase db)
{
    var col = db.GetCollection<BsonDocument>("electives");
    var keys = Builders<BsonDocument>.IndexKeys;

    await col.Indexes.CreateManyAsync(new[]
    {
        new CreateIndexModel<BsonDocument>(
            keys.Ascending("elective_type").Ascending("tryb_studiow").Ascending("is_stary").Ascending("lang"),
            new CreateIndexOptions { Unique = true }),
        new CreateIndexModel<BsonDocument>(
            keys.Ascending("groups.items.code")),
        new CreateIndexModel<BsonDocument>(
            keys.Ascending("specializations.items.code")),
    });
    Log.Information("electives indexes created");
}

// ─────────────────────────────────────────────────────────────────────────────
// Seed helpers
// ─────────────────────────────────────────────────────────────────────────────

static async Task<int> SeedSyllabi(IMongoDatabase db, string repoRoot)
{
    var col = db.GetCollection<BsonDocument>("syllabi");
    var sources = new[]
    {
        (Dir: Path.Combine(repoRoot, "frontend/public/assets/syllabusy"),        TrybStudiow: "stacjonarny",    IsStary: false),
        (Dir: Path.Combine(repoRoot, "frontend/public/assets/syllabusy-n"),      TrybStudiow: "niestacjonarny", IsStary: false),
        (Dir: Path.Combine(repoRoot, "frontend/public/assets/stary/stac/sylabusy"), TrybStudiow: "stacjonarny",  IsStary: true),
        (Dir: Path.Combine(repoRoot, "frontend/public/assets/stary/nstac/sylabusy"),TrybStudiow: "niestacjonarny",IsStary: true),
    };

    var total = 0;
    foreach (var src in sources)
    {
        if (!Directory.Exists(src.Dir)) { Log.Warning("Directory not found: {Dir}", src.Dir); continue; }

        foreach (var file in Directory.GetFiles(src.Dir, "*.json"))
        {
            var json = await File.ReadAllTextAsync(file);
            var raw = BsonDocument.Parse(json);

            // The JSON root may be the sylabus itself or wrapped in { "sylabus": {...} }
            var syllabusDoc = raw.Contains("sylabus") ? raw["sylabus"].AsBsonDocument : raw;
            var kod = syllabusDoc.GetValue("kod_przedmiotu", BsonNull.Value).ToString();
            if (string.IsNullOrWhiteSpace(kod) || kod == "BsonNull") continue;

            var doc = new BsonDocument
            {
                { "kod_przedmiotu", kod },
                { "tryb_studiow", src.TrybStudiow },
                { "is_stary", src.IsStary },
                { "_source", Path.GetRelativePath(repoRoot, file).Replace('\\', '/') },
                { "sylabus", syllabusDoc },
            };

            var filter = Builders<BsonDocument>.Filter.And(
                Builders<BsonDocument>.Filter.Eq("kod_przedmiotu", kod),
                Builders<BsonDocument>.Filter.Eq("tryb_studiow", src.TrybStudiow),
                Builders<BsonDocument>.Filter.Eq("is_stary", src.IsStary));

            await col.ReplaceOneAsync(filter, doc, new ReplaceOptions { IsUpsert = true });
            total++;
        }
    }
    return total;
}

static async Task<int> SeedPrograms(IMongoDatabase db, string repoRoot)
{
    var col = db.GetCollection<BsonDocument>("programs");
    var sources = new[]
    {
        (File: "frontend/public/assets/program.json",                       TrybStudiow: "stacjonarny",    IsStary: false, Lang: "pl"),
        (File: "frontend/public/assets/program-en.json",                    TrybStudiow: "stacjonarny",    IsStary: false, Lang: "en"),
        (File: "frontend/public/assets/niestacjonarne/program.json",        TrybStudiow: "niestacjonarny", IsStary: false, Lang: "pl"),
        (File: "frontend/public/assets/niestacjonarne/program-en.json",     TrybStudiow: "niestacjonarny", IsStary: false, Lang: "en"),
        (File: "frontend/public/assets/stary/stac/program.json",            TrybStudiow: "stacjonarny",    IsStary: true,  Lang: "pl"),
        (File: "frontend/public/assets/stary/nstac/program.json",           TrybStudiow: "niestacjonarny", IsStary: true,  Lang: "pl"),
    };

    var total = 0;
    foreach (var src in sources)
    {
        var path = Path.Combine(repoRoot, src.File);
        if (!File.Exists(path)) { Log.Warning("File not found: {Path}", path); continue; }

        var json = await File.ReadAllTextAsync(path);
        var raw = BsonDocument.Parse(json);
        raw["tryb_studiow"] = src.TrybStudiow;
        raw["is_stary"]     = src.IsStary;
        raw["lang"]         = src.Lang;
        raw["_source"]      = src.File;

        var filter = Builders<BsonDocument>.Filter.And(
            Builders<BsonDocument>.Filter.Eq("tryb_studiow", src.TrybStudiow),
            Builders<BsonDocument>.Filter.Eq("is_stary", src.IsStary),
            Builders<BsonDocument>.Filter.Eq("lang", src.Lang));

        await col.ReplaceOneAsync(filter, raw, new ReplaceOptions { IsUpsert = true });
        total++;
    }
    return total;
}

static async Task<int> SeedElectives(IMongoDatabase db, string repoRoot)
{
    var col = db.GetCollection<BsonDocument>("electives");
    var sources = new[]
    {
        (File: "frontend/public/assets/electives-other.json",                           ElectiveType: "other",           TrybStudiow: "stacjonarny",    IsStary: false, Lang: "pl"),
        (File: "frontend/public/assets/electives-other-en.json",                        ElectiveType: "other",           TrybStudiow: "stacjonarny",    IsStary: false, Lang: "en"),
        (File: "frontend/public/assets/electives-specializations.json",                  ElectiveType: "specializations", TrybStudiow: "stacjonarny",    IsStary: false, Lang: "pl"),
        (File: "frontend/public/assets/electives-specializations-en.json",               ElectiveType: "specializations", TrybStudiow: "stacjonarny",    IsStary: false, Lang: "en"),
        (File: "frontend/public/assets/niestacjonarne/electives-other.json",             ElectiveType: "other",           TrybStudiow: "niestacjonarny", IsStary: false, Lang: "pl"),
        (File: "frontend/public/assets/niestacjonarne/electives-other-en.json",          ElectiveType: "other",           TrybStudiow: "niestacjonarny", IsStary: false, Lang: "en"),
        (File: "frontend/public/assets/niestacjonarne/electives-specializations.json",   ElectiveType: "specializations", TrybStudiow: "niestacjonarny", IsStary: false, Lang: "pl"),
        (File: "frontend/public/assets/niestacjonarne/electives-specializations-en.json",ElectiveType: "specializations", TrybStudiow: "niestacjonarny", IsStary: false, Lang: "en"),
        (File: "frontend/public/assets/stary/stac/electives-other.json",                 ElectiveType: "other",           TrybStudiow: "stacjonarny",    IsStary: true,  Lang: "pl"),
        (File: "frontend/public/assets/stary/stac/electives-specializations.json",       ElectiveType: "specializations", TrybStudiow: "stacjonarny",    IsStary: true,  Lang: "pl"),
        (File: "frontend/public/assets/stary/nstac/electives-other.json",                ElectiveType: "other",           TrybStudiow: "niestacjonarny", IsStary: true,  Lang: "pl"),
        (File: "frontend/public/assets/stary/nstac/electives-specializations.json",      ElectiveType: "specializations", TrybStudiow: "niestacjonarny", IsStary: true,  Lang: "pl"),
    };

    var total = 0;
    foreach (var src in sources)
    {
        var path = Path.Combine(repoRoot, src.File);
        if (!File.Exists(path)) { Log.Warning("File not found: {Path}", path); continue; }

        var json = await File.ReadAllTextAsync(path);
        var raw = BsonDocument.Parse(json);
        raw["elective_type"] = src.ElectiveType;
        raw["tryb_studiow"]  = src.TrybStudiow;
        raw["is_stary"]      = src.IsStary;
        raw["lang"]          = src.Lang;
        raw["_source"]       = src.File;

        var filter = Builders<BsonDocument>.Filter.And(
            Builders<BsonDocument>.Filter.Eq("elective_type", src.ElectiveType),
            Builders<BsonDocument>.Filter.Eq("tryb_studiow",  src.TrybStudiow),
            Builders<BsonDocument>.Filter.Eq("is_stary",      src.IsStary),
            Builders<BsonDocument>.Filter.Eq("lang",          src.Lang));

        await col.ReplaceOneAsync(filter, raw, new ReplaceOptions { IsUpsert = true });
        total++;
    }
    return total;
}

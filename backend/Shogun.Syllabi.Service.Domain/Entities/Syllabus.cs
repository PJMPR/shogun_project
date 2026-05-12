using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace Shogun.Syllabi.Service.Domain.Entities;

/// <summary>
/// Syllabus document stored in `syllabi` collection.
/// Fields mirror the MongoDB document exactly (JSON field names preserved).
/// </summary>
public class Syllabus
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string? Id { get; set; }

    [BsonElement("kod_przedmiotu")]
    public string kod_przedmiotu { get; set; } = default!;

    [BsonElement("tryb_studiow")]
    public string tryb_studiow { get; set; } = default!;

    [BsonElement("is_stary")]
    public bool is_stary { get; set; }

    [BsonElement("_source")]
    public string? _source { get; set; }

    [BsonElement("sylabus")]
    [BsonExtraElements]
    public BsonDocument sylabus { get; set; } = new BsonDocument();
}

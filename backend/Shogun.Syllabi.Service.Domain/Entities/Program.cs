using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace Shogun.Syllabi.Service.Domain.Entities;

/// <summary>
/// Study program document stored in `programs` collection.
/// </summary>
public class Program
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string? Id { get; set; }

    [BsonElement("tryb_studiow")]
    public string tryb_studiow { get; set; } = default!;

    [BsonElement("is_stary")]
    public bool is_stary { get; set; }

    [BsonElement("lang")]
    public string lang { get; set; } = default!;

    [BsonElement("_source")]
    public string? _source { get; set; }

    /// <summary>All remaining program-level fields (pdf, semesters, etc.).</summary>
    [BsonExtraElements]
    public BsonDocument ExtraElements { get; set; } = new BsonDocument();
}

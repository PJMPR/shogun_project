using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace Shogun.Service.Api.Domain.Entities;

/// <summary>
/// Elective courses document stored in `electives` collection.
/// </summary>
public class Elective
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string? Id { get; set; }

    [BsonElement("elective_type")]
    public string elective_type { get; set; } = default!;

    [BsonElement("tryb_studiow")]
    public string tryb_studiow { get; set; } = default!;

    [BsonElement("is_stary")]
    public bool is_stary { get; set; }

    [BsonElement("lang")]
    public string lang { get; set; } = default!;

    [BsonElement("_source")]
    public string? _source { get; set; }

    /// <summary>All remaining fields (groups, specializations, etc.).</summary>
    [BsonExtraElements]
    public BsonDocument ExtraElements { get; set; } = new BsonDocument();
}

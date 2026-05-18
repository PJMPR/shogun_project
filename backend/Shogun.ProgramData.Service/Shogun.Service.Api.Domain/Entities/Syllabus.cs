using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace Shogun.Service.Api.Domain.Entities;

/// <summary>
/// Syllabus document stored in `syllabi` collection.
/// Property names follow English PascalCase; BsonElement attributes preserve
/// the original snake_case field names used in MongoDB.
/// </summary>
public class Syllabus
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string? Id { get; set; }

    [BsonElement("kod_przedmiotu")]
    public string SubjectCode { get; set; } = default!;

    [BsonElement("tryb_studiow")]
    public string StudyMode { get; set; } = default!;

    [BsonElement("is_stary")]
    public bool IsLegacy { get; set; }

    [BsonElement("_source")]
    public string? Source { get; set; }

    [BsonElement("sylabus")]
    public SyllabusContent? Content { get; set; }
}

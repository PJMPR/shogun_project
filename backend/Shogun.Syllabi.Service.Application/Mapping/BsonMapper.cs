using MongoDB.Bson;
using System.Text.Json;
using System.Text.Json.Nodes;

namespace Shogun.Syllabi.Service.Application.Mapping;

public static class BsonMapper
{
    /// <summary>Converts BsonDocument to JsonObject (via JSON roundtrip).</summary>
    public static JsonObject? ToJsonObject(BsonDocument? doc)
    {
        if (doc is null) return null;
        var json = doc.ToJson(new MongoDB.Bson.IO.JsonWriterSettings { OutputMode = MongoDB.Bson.IO.JsonOutputMode.RelaxedExtendedJson });
        return JsonNode.Parse(json) as JsonObject;
    }

    /// <summary>Converts JsonObject to BsonDocument.</summary>
    public static BsonDocument ToBsonDocument(JsonObject? obj)
    {
        if (obj is null) return new BsonDocument();
        var json = obj.ToJsonString();
        return BsonDocument.Parse(json);
    }
}

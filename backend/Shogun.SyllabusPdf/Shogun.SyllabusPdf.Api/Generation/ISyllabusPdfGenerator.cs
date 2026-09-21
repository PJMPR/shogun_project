using System.Text.Json;

namespace Shogun.SyllabusPdf.Api.Generation;

public interface ISyllabusPdfGenerator
{
    Task<byte[]> GenerateAsync(JsonElement document, CancellationToken cancellationToken);
}

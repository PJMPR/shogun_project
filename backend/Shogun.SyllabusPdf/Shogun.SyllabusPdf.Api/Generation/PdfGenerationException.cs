namespace Shogun.SyllabusPdf.Api.Generation;

public sealed class PdfGenerationException(string message, string? details = null, Exception? innerException = null)
    : Exception(message, innerException)
{
    public string? Details { get; } = details;
}

public sealed class PdfGenerationTimeoutException(string message) : Exception(message);

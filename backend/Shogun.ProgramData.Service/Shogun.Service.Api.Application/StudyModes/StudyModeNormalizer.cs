namespace Shogun.Service.Api.Application.StudyModes;

public static class StudyModeNormalizer
{
    public static string Normalize(string value)
    {
        var normalized = value.Trim().ToLowerInvariant();

        if (normalized.StartsWith("niestacjon", StringComparison.Ordinal))
            return "niestacjonarny";

        if (normalized.StartsWith("stacjon", StringComparison.Ordinal))
            return "stacjonarny";

        return normalized;
    }

    public static bool IsValid(string? value) =>
        !string.IsNullOrWhiteSpace(value) &&
        Normalize(value) is "stacjonarny" or "niestacjonarny";
}

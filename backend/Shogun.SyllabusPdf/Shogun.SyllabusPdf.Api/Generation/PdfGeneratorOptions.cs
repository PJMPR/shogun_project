namespace Shogun.SyllabusPdf.Api.Generation;

public sealed class PdfGeneratorOptions
{
    public const string SectionName = "Generator";

    public string ScriptPath { get; init; } = "Generator/generate-syllabus.ps1";
    public string? PowerShellExecutable { get; init; }
    public int TimeoutSeconds { get; init; } = 60;
    public int MaxConcurrency { get; init; } = 2;
}

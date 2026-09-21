using System.Diagnostics;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Options;

namespace Shogun.SyllabusPdf.Api.Generation;

public sealed class PowerShellSyllabusPdfGenerator : ISyllabusPdfGenerator, IDisposable
{
    private readonly PdfGeneratorOptions _options;
    private readonly ILogger<PowerShellSyllabusPdfGenerator> _logger;
    private readonly string _scriptPath;
    private readonly SemaphoreSlim _concurrency;

    public PowerShellSyllabusPdfGenerator(
        IOptions<PdfGeneratorOptions> options,
        ILogger<PowerShellSyllabusPdfGenerator> logger)
    {
        _options = options.Value;
        _logger = logger;

        if (_options.MaxConcurrency < 1)
            throw new InvalidOperationException("Generator:MaxConcurrency musi byc wieksze od zera.");
        if (_options.TimeoutSeconds < 1)
            throw new InvalidOperationException("Generator:TimeoutSeconds musi byc wieksze od zera.");

        _scriptPath = Path.GetFullPath(_options.ScriptPath, AppContext.BaseDirectory);
        if (!File.Exists(_scriptPath))
            throw new FileNotFoundException("Nie znaleziono skryptu generatora PDF.", _scriptPath);

        _concurrency = new SemaphoreSlim(_options.MaxConcurrency, _options.MaxConcurrency);
    }

    public async Task<byte[]> GenerateAsync(JsonElement document, CancellationToken cancellationToken)
    {
        await _concurrency.WaitAsync(cancellationToken);
        var workingDirectory = Path.Combine(Path.GetTempPath(), $"shogun-syllabus-api-{Guid.NewGuid():N}");

        try
        {
            Directory.CreateDirectory(workingDirectory);
            var inputPath = Path.Combine(workingDirectory, "input.json");
            var outputPath = Path.Combine(workingDirectory, "output.pdf");
            await File.WriteAllTextAsync(inputPath, document.GetRawText(), new UTF8Encoding(false), cancellationToken);

            using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(_options.TimeoutSeconds));
            using var linkedCancellation = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken, timeout.Token);
            using var process = CreateProcess(inputPath, outputPath);

            _logger.LogInformation("Starting syllabus PDF generation in {WorkingDirectory}", workingDirectory);
            process.Start();
            var stdoutTask = process.StandardOutput.ReadToEndAsync(linkedCancellation.Token);
            var stderrTask = process.StandardError.ReadToEndAsync(linkedCancellation.Token);

            try
            {
                await process.WaitForExitAsync(linkedCancellation.Token);
            }
            catch (OperationCanceledException) when (timeout.IsCancellationRequested && !cancellationToken.IsCancellationRequested)
            {
                TryKill(process);
                throw new PdfGenerationTimeoutException($"Generowanie PDF przekroczylo limit {_options.TimeoutSeconds} sekund.");
            }
            catch (OperationCanceledException)
            {
                TryKill(process);
                throw;
            }

            var stdout = await stdoutTask;
            var stderr = await stderrTask;
            if (process.ExitCode != 0 || !File.Exists(outputPath))
            {
                var details = string.Join(Environment.NewLine, new[] { stdout, stderr }
                    .Where(value => !string.IsNullOrWhiteSpace(value)))
                    .Trim();
                throw new PdfGenerationException("Nie udalo sie wygenerowac PDF.", details);
            }

            return await File.ReadAllBytesAsync(outputPath, cancellationToken);
        }
        finally
        {
            TryDeleteDirectory(workingDirectory);
            _concurrency.Release();
        }
    }

    private Process CreateProcess(string inputPath, string outputPath)
    {
        var executable = _options.PowerShellExecutable ?? (OperatingSystem.IsWindows() ? "powershell.exe" : "pwsh");
        var startInfo = new ProcessStartInfo
        {
            FileName = executable,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            UseShellExecute = false,
            CreateNoWindow = true,
            WorkingDirectory = Path.GetDirectoryName(_scriptPath)!
        };

        startInfo.ArgumentList.Add("-NoProfile");
        if (OperatingSystem.IsWindows())
        {
            startInfo.ArgumentList.Add("-ExecutionPolicy");
            startInfo.ArgumentList.Add("Bypass");
        }
        startInfo.ArgumentList.Add("-File");
        startInfo.ArgumentList.Add(_scriptPath);
        startInfo.ArgumentList.Add("-InputFile");
        startInfo.ArgumentList.Add(inputPath);
        startInfo.ArgumentList.Add("-OutputFile");
        startInfo.ArgumentList.Add(outputPath);

        return new Process { StartInfo = startInfo };
    }

    private static void TryKill(Process process)
    {
        try
        {
            if (!process.HasExited)
                process.Kill(entireProcessTree: true);
        }
        catch (InvalidOperationException)
        {
        }
    }

    private void TryDeleteDirectory(string path)
    {
        try
        {
            if (Directory.Exists(path))
                Directory.Delete(path, recursive: true);
        }
        catch (Exception exception)
        {
            _logger.LogWarning(exception, "Could not delete generator working directory {WorkingDirectory}", path);
        }
    }

    public void Dispose()
    {
        _concurrency.Dispose();
    }
}

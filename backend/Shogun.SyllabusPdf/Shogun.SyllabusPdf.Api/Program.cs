using Shogun.SyllabusPdf.Api.Generation;
using Shogun.SyllabusPdf.Api.Middleware;

var builder = WebApplication.CreateBuilder(args);

builder.WebHost.ConfigureKestrel(options =>
{
    options.Limits.MaxRequestBodySize = 2 * 1024 * 1024;
});

builder.Services.AddControllers();
builder.Services.AddProblemDetails();
builder.Services.AddExceptionHandler<GlobalExceptionHandler>();
builder.Services.AddHealthChecks();
builder.Services.Configure<PdfGeneratorOptions>(builder.Configuration.GetSection(PdfGeneratorOptions.SectionName));
builder.Services.AddSingleton<ISyllabusPdfGenerator, PowerShellSyllabusPdfGenerator>();

var app = builder.Build();

app.UseExceptionHandler();
app.MapControllers();
app.MapHealthChecks("/health/live");
app.MapHealthChecks("/health/ready");

app.Run();

public partial class Program;

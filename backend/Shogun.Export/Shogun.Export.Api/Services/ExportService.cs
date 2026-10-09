using Shogun.Export.Api.Clients;
using Shogun.Export.Api.Generators;
using Shogun.Export.Api.Models;
using Shogun.Schedule.Application;
using Shogun.Schedule.Domain;

namespace Shogun.Export.Api.Services;

public sealed class ExportService(ScheduleSourceClient schedule, ProgramDataSourceClient program, LecturersExportGenerator lecturers, StudyProgramExportGenerator studyProgram)
{
    public async Task<byte[]> GenerateAsync(bool studyProgramExport, ExportQuery query, CancellationToken ct)
    {
        if (!System.Text.RegularExpressions.Regex.IsMatch(query.AcademicYear, "^[0-9]{4}/[0-9]{4}$")) throw new ValidationException("Niepoprawny rok akademicki.");
        if (string.IsNullOrWhiteSpace(query.FacultyCode)) throw new ValidationException("Kierunek jest wymagany.");
        var workload = await schedule.GetWorkloadAsync(query, ct);
        if (workload.Lecturers.Count == 0) throw new NotFoundException("Brak danych dla wybranego zakresu.");
        var syllabi = studyProgramExport ? await program.GetSyllabiAsync(query, workload, ct) : [];
        IExportGenerator generator = studyProgramExport ? studyProgram : lecturers;
        return generator.Generate(new ExportData(workload, syllabi), query);
    }
}

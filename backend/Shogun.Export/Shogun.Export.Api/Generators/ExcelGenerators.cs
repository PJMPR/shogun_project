using ClosedXML.Excel;
using Shogun.Export.Api.Models;
using Shogun.Schedule.Application;
using Shogun.Schedule.Domain;

namespace Shogun.Export.Api.Generators;

public interface IExportGenerator { byte[] Generate(ExportData data, ExportQuery query); }
internal sealed record ProgramRow(int SemesterNumber, FacultySubjectDto Subject, ExportSyllabus? Syllabus, IReadOnlyList<FacultyAssignmentDto> Assignments);

public sealed class LecturersExportGenerator(IHostEnvironment environment) : IExportGenerator
{
    public byte[] Generate(ExportData data, ExportQuery query)
    {
        using var workbook = new XLWorkbook(Path.Combine(environment.ContentRootPath, "Assets-Lecturers.xlsx"));
        var sheet = workbook.Worksheets.First();
        sheet.Cell("B2").Value = $"program realizowany w roku akademickim {query.AcademicYear}";
        sheet.Cell("B3").Value = "stopień: I";
        sheet.Cell("B4").Value = $"tryb: {(query.StudyMode == StudyMode.Stationary ? "stacjonarny" : "niestacjonarny")}";
        sheet.Cell("B7").Value = $"na kierunku: {query.FacultyCode}";
        var row = 10;
        foreach (var lecturer in data.Workload.Lecturers.OrderBy(x => x.DisplayName, StringComparer.CurrentCulture).ThenBy(x => x.Id))
        {
            if (row > 22) sheet.Row(row - 1).InsertRowsBelow(1);
            sheet.Cell(row, 1).Value = row - 9;
            sheet.Cell(row, 2).Value = lecturer.DisplayName;
            sheet.Cell(row, 3).Value = lecturer.AcademicTitle ?? string.Empty;
            row++;
        }
        using var stream = new MemoryStream(); workbook.SaveAs(stream); return stream.ToArray();
    }
}

public sealed class StudyProgramExportGenerator(IHostEnvironment environment) : IExportGenerator
{
    public byte[] Generate(ExportData data, ExportQuery query)
    {
        using var workbook = new XLWorkbook(Path.Combine(environment.ContentRootPath, "Assets-Program.xlsx"));
        var sheet = workbook.Worksheets.First();
        sheet.Cell("C1").Value = $"program realizowany w roku akademickim {query.AcademicYear}";
        sheet.Cell("C2").Value = $"Kierunek: {query.FacultyCode}";
        sheet.Cell("M1").Value = query.StudyMode == StudyMode.Stationary ? "STUDIA STACJONARNE PIERWSZEGO STOPNIA" : "STUDIA NIESTACJONARNE PIERWSZEGO STOPNIA";

        var syllabusByCode = data.Syllabi.GroupBy(x => x.SubjectCode, StringComparer.OrdinalIgnoreCase).ToDictionary(x => x.Key, x => x.ToList(), StringComparer.OrdinalIgnoreCase);
        var lecturers = data.Workload.Lecturers.ToDictionary(x => x.Id);
        var maxLecture = data.Workload.Assignments.Where(x => IsLecture(x.ClassType)).Select(x => x.LecturerId).Distinct().Count();
        var maxExercises = data.Workload.Assignments.Where(x => !IsLecture(x.ClassType)).Select(x => x.LecturerId).Distinct().Count();
        maxLecture = Math.Max(1, maxLecture); maxExercises = Math.Max(1, maxExercises);
        var exerciseStart = ConfigureLecturerColumns(sheet, maxLecture, maxExercises);
        var rows = data.Workload.Assignments.GroupBy(x => (x.SubjectId, x.SemesterNumber)).Select(group =>
        {
            var subject = data.Workload.Subjects.Single(s => s.Id == group.Key.SubjectId);
            var syllabi = subject.Code is not null && syllabusByCode.TryGetValue(subject.Code, out var found) ? found.Where(s => s.Content?.Semester is null || s.Content.Semester == group.Key.SemesterNumber).ToList() : [];
            var syllabus = syllabi.Count == 1 ? syllabi[0] : null;
            return new ProgramRow(group.Key.SemesterNumber, subject, syllabus, group.ToList());
        }).OrderBy(x => x.SemesterNumber).ThenBy(x => x.Subject.Name, StringComparer.CurrentCulture).ToList();

        var firstRows = new[] { 6, 13, 20, 27, 33, 40, 46, 52 }; var capacity = new[] { 7, 7, 7, 6, 7, 6, 6, 6 }; var offset = 0;
        foreach (var semester in Enumerable.Range(1, 8))
        {
            var semesterRows = rows.Where(x => x.SemesterNumber == semester).ToList(); var start = firstRows[semester - 1] + offset;
            if (semesterRows.Count > capacity[semester - 1]) { var extra = semesterRows.Count - capacity[semester - 1]; sheet.Row(start + capacity[semester - 1] - 1).InsertRowsBelow(extra); offset += extra; }
            for (var i = 0; i < semesterRows.Count; i++) WriteRow(sheet, start + i, semesterRows[i], lecturers, maxLecture, maxExercises, exerciseStart);
        }
        var lastColumn = exerciseStart + maxExercises * 2 - 1;
        ApplyTableStyle(sheet, offset, lastColumn);
        UpdatePrintArea(sheet, offset, lastColumn);
        using var stream = new MemoryStream(); workbook.SaveAs(stream); return stream.ToArray();
    }

    private static void WriteRow(IXLWorksheet sheet, int row, ProgramRow item, IReadOnlyDictionary<Guid, FacultyLecturerDto> lecturers, int maxLecture, int maxExercises, int exerciseStart)
    {
        sheet.Cell(row, 2).Value = item.SemesterNumber; sheet.Cell(row, 3).Value = item.Subject.Name; sheet.Cell(row, 4).Value = item.Subject.Code ?? string.Empty;
        var content = item.Syllabus?.Content; sheet.Cell(row, 5).Value = content?.ClassHoursForm?.Lectures; sheet.Cell(row, 6).Value = (content?.ClassHoursForm?.ExercisesLectorateSeminar ?? 0) + (content?.ClassHoursForm?.LaboratoryProject ?? 0); sheet.Cell(row, 15).Value = content?.Ects;
        var lecture = item.Assignments.Where(x => IsLecture(x.ClassType)).GroupBy(x => x.LecturerId).OrderBy(x => lecturers[x.Key].DisplayName, StringComparer.CurrentCulture).ThenBy(x => x.Key).ToList();
        var exercise = item.Assignments.Where(x => !IsLecture(x.ClassType)).GroupBy(x => x.LecturerId).OrderBy(x => lecturers[x.Key].DisplayName, StringComparer.CurrentCulture).ThenBy(x => x.Key).ToList();
        for (var i = 0; i < maxLecture; i++) { sheet.Cell(row, 16 + i * 2).Value = i < lecture.Count ? lecturers[lecture[i].Key].DisplayName : string.Empty; sheet.Cell(row, 17 + i * 2).Value = i < lecture.Count ? lecture[i].Where(x => x.WorkloadHours.HasValue).Sum(x => x.WorkloadHours) : null; }
        for (var i = 0; i < maxExercises; i++) { sheet.Cell(row, exerciseStart + i * 2).Value = i < exercise.Count ? lecturers[exercise[i].Key].DisplayName : string.Empty; sheet.Cell(row, exerciseStart + i * 2 + 1).Value = i < exercise.Count ? exercise[i].Where(x => x.WorkloadHours.HasValue).Sum(x => x.WorkloadHours) : null; }
    }

    private static bool IsLecture(string? classType) => classType?.StartsWith("wyk", StringComparison.OrdinalIgnoreCase) == true;

    private static int ConfigureLecturerColumns(IXLWorksheet sheet, int lecturePairs, int exercisePairs)
    {
        const int firstColumn = 16; const int templateLecturePairs = 2;
        if (lecturePairs < templateLecturePairs) sheet.Columns(firstColumn + lecturePairs * 2, firstColumn + templateLecturePairs * 2 - 1).Delete();
        else if (lecturePairs > templateLecturePairs) { var added = (lecturePairs - templateLecturePairs) * 2; sheet.Column(firstColumn + templateLecturePairs * 2).InsertColumnsBefore(added); for (var column = firstColumn + templateLecturePairs * 2; column < firstColumn + lecturePairs * 2; column++) CopyColumnStyle(sheet, firstColumn + 2, column); }
        var exerciseStart = firstColumn + lecturePairs * 2;
        if (exercisePairs > 1) { var added = (exercisePairs - 1) * 2; sheet.Column(exerciseStart + 2).InsertColumnsBefore(added); for (var column = exerciseStart + 2; column < exerciseStart + exercisePairs * 2; column++) CopyColumnStyle(sheet, exerciseStart, column); }
        for (var i = 0; i < lecturePairs; i++) SetHeaderPair(sheet, firstColumn + i * 2, "Prowadzący wykład", "godziny wykładu");
        for (var i = 0; i < exercisePairs; i++) SetHeaderPair(sheet, exerciseStart + i * 2, "Prowadzący ćwiczenia", "godziny ćwiczeń");
        return exerciseStart;
    }

    private static void SetHeaderPair(IXLWorksheet sheet, int nameColumn, string name, string hours)
    {
        var nameRange = sheet.Range(4, nameColumn, 5, nameColumn); if (!nameRange.IsMerged()) nameRange.Merge();
        var hoursRange = sheet.Range(4, nameColumn + 1, 5, nameColumn + 1); if (!hoursRange.IsMerged()) hoursRange.Merge();
        sheet.Cell(4, nameColumn).Value = name; sheet.Cell(4, nameColumn + 1).Value = hours;
        var header = sheet.Range(4, nameColumn, 5, nameColumn + 1); header.Style.Fill.BackgroundColor = XLColor.Yellow; header.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center; header.Style.Alignment.Vertical = XLAlignmentVerticalValues.Center; header.Style.Alignment.WrapText = true;
        header.Style.Font.Bold = true;
    }

    private static void CopyColumnStyle(IXLWorksheet sheet, int sourceColumn, int destinationColumn) => sheet.Column(sourceColumn).CopyTo(sheet.Column(destinationColumn));

    private static void UpdatePrintArea(IXLWorksheet sheet, int offset, int lastColumn)
    {
        var lastRow = Math.Max(71, 66 + offset); sheet.PageSetup.PrintAreas.Clear(); sheet.PageSetup.PrintAreas.Add($"B1:{XLHelper.GetColumnLetterFromNumber(lastColumn)}{lastRow}");
    }

    private static void ApplyTableStyle(IXLWorksheet sheet, int offset, int lastColumn)
    {
        var lastRow = Math.Max(71, 66 + offset);
        var table = sheet.Range(4, 2, lastRow, lastColumn);
        table.Style.Border.SetOutsideBorder(XLBorderStyleValues.Thin);
        table.Style.Border.SetInsideBorder(XLBorderStyleValues.Thin);
        sheet.Range(4, 2, 5, lastColumn).Style.Font.Bold = true;
    }
}

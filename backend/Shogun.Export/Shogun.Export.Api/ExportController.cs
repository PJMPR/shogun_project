using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Shogun.Export.Api.Models;
using Shogun.Export.Api.Services;
using Shogun.Schedule.Domain;

namespace Shogun.Export.Api;

[ApiController, Route("api/v1/exports"), Authorize(Roles = "admin,dezyderaty")]
public sealed class ExportController(ExportService service) : ControllerBase
{
    [HttpGet("study-program")]
    public async Task<IActionResult> StudyProgram([FromQuery] string academicYear, [FromQuery] string facultyCode, [FromQuery] StudyMode studyMode, CancellationToken ct)
        => File(await service.GenerateAsync(true, new ExportQuery(academicYear, facultyCode, studyMode), ct), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", FileName("program-studiow"));

    [HttpGet("lecturers")]
    public async Task<IActionResult> Lecturers([FromQuery] string academicYear, [FromQuery] string facultyCode, [FromQuery] StudyMode studyMode, CancellationToken ct)
        => File(await service.GenerateAsync(false, new ExportQuery(academicYear, facultyCode, studyMode), ct), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", FileName("lista-prowadzacych"));

    private string FileName(string kind) => $"{kind}-{Request.Query["facultyCode"]}-{Request.Query["academicYear"].ToString().Replace('/', '-')}-{Request.Query["studyMode"]}.xlsx";
}

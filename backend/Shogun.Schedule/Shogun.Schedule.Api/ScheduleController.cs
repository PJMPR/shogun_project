using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Shogun.Schedule.Application;

namespace Shogun.Schedule.Api;

[ApiController, Route("api/v1/schedules")]
public sealed class ScheduleController(IScheduleService service) : ControllerBase
{
    [HttpGet("published")] public Task<IReadOnlyList<ScheduleSummaryDto>> ListPublished([FromQuery] string? facultyCode, [FromQuery] string? academicYear, CancellationToken ct) => service.ListPublishedAsync(facultyCode, academicYear, ct);
    [HttpGet("published/{id:guid}")] public Task<ScheduleDto> GetPublished(Guid id, CancellationToken ct) => service.GetPublishedAsync(id, ct);
    [HttpGet, Authorize(Roles = "admin,planner")] public Task<IReadOnlyList<ScheduleSummaryDto>> List([FromQuery] string? facultyCode, [FromQuery] string? academicYear, CancellationToken ct) => service.ListAsync(facultyCode, academicYear, ct);
    [HttpGet("{id:guid}"), Authorize(Roles = "admin,planner")] public Task<ScheduleDto> Get(Guid id, CancellationToken ct) => service.GetAsync(id, ct);
    [HttpPost, Authorize(Roles = "admin,planner")] public async Task<ActionResult<ScheduleDto>> Create(CreateScheduleRequest request, CancellationToken ct) { var result = await service.CreateAsync(request, User.ToCurrentUser(), ct); return CreatedAtAction(nameof(Get), new { id = result.Id }, result); }
    [HttpPut("{id:guid}/save"), Authorize(Roles = "admin,planner")] public Task<ScheduleDto> Save(Guid id, SaveScheduleRequest request, CancellationToken ct) => service.SaveAsync(id, request, User.ToCurrentUser(), ct);
    [HttpDelete("{id:guid}"), Authorize(Roles = "admin,planner")] public async Task<IActionResult> Delete(Guid id, DeleteScheduleRequest request, CancellationToken ct) { await service.DeleteAsync(id, request, ct); return NoContent(); }
    [HttpPost("{id:guid}/subjects"), Authorize(Roles = "admin,planner")] public Task<ScheduleSubjectDto> AddSubject(Guid id, SaveScheduleSubjectRequest request, CancellationToken ct) => service.AddSubjectAsync(id, request, User.ToCurrentUser(), ct);
    [HttpPut("{id:guid}/subjects/{subjectId:guid}"), Authorize(Roles = "admin")] public Task<ScheduleSubjectDto> UpdateSubject(Guid id, Guid subjectId, SaveScheduleSubjectRequest request, CancellationToken ct) => service.UpdateSubjectAsync(id, subjectId, request, User.ToCurrentUser(), ct);
    [HttpDelete("{id:guid}/subjects/{subjectId:guid}"), Authorize(Roles = "admin")] public async Task<IActionResult> DeleteSubject(Guid id, Guid subjectId, CancellationToken ct) { await service.DeleteSubjectAsync(id, subjectId, ct); return NoContent(); }
    [HttpPost("{id:guid}/lecturers"), Authorize(Roles = "admin,planner")] public Task<ScheduleLecturerDto> AddLecturer(Guid id, SaveScheduleLecturerRequest request, CancellationToken ct) => service.AddLecturerAsync(id, request, User.ToCurrentUser(), ct);
    [HttpPut("{id:guid}/lecturers/{lecturerId:guid}"), Authorize(Roles = "admin")] public Task<ScheduleLecturerDto> UpdateLecturer(Guid id, Guid lecturerId, SaveScheduleLecturerRequest request, CancellationToken ct) => service.UpdateLecturerAsync(id, lecturerId, request, User.ToCurrentUser(), ct);
    [HttpDelete("{id:guid}/lecturers/{lecturerId:guid}"), Authorize(Roles = "admin")] public async Task<IActionResult> DeleteLecturer(Guid id, Guid lecturerId, CancellationToken ct) { await service.DeleteLecturerAsync(id, lecturerId, ct); return NoContent(); }
    [HttpPost("{id:guid}/subject-lecturers"), Authorize(Roles = "admin,planner")] public Task<ScheduleSubjectLecturerDto> AddSubjectLecturer(Guid id, AddScheduleSubjectLecturerRequest request, CancellationToken ct) => service.AddSubjectLecturerAsync(id, request, User.ToCurrentUser(), ct);
    [HttpDelete("{id:guid}/subject-lecturers/{assignmentId:guid}"), Authorize(Roles = "admin,planner")] public async Task<IActionResult> DeleteSubjectLecturer(Guid id, Guid assignmentId, CancellationToken ct) { await service.DeleteSubjectLecturerAsync(id, assignmentId, ct); return NoContent(); }
}

[ApiController, Route("api/v1")]
public sealed class ScheduleCommentsController(IScheduleService service) : ControllerBase
{
    [HttpGet("entries/{entryId:guid}/comments")] public Task<IReadOnlyList<CommentDto>> List(Guid entryId, CancellationToken ct) => service.ListCommentsAsync(entryId, User.ToCurrentUser(), ct);
    [HttpPost("entries/{entryId:guid}/comments")] public Task<CommentDto> Add(Guid entryId, AddCommentRequest request, CancellationToken ct) => service.AddCommentAsync(entryId, request, User.ToCurrentUser(), ct);
    [HttpPut("comments/{id:guid}")] public Task<CommentDto> Edit(Guid id, EditCommentRequest request, CancellationToken ct) => service.EditCommentAsync(id, request, User.ToCurrentUser(), ct);
    [HttpDelete("comments/{id:guid}")] public async Task<IActionResult> Delete(Guid id, CancellationToken ct) { await service.DeleteCommentAsync(id, User.ToCurrentUser(), ct); return NoContent(); }
}

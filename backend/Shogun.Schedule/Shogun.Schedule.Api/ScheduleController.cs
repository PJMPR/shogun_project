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
}

[ApiController, Route("api/v1")]
public sealed class ScheduleCommentsController(IScheduleService service) : ControllerBase
{
    [HttpGet("entries/{entryId:guid}/comments")] public Task<IReadOnlyList<CommentDto>> List(Guid entryId, CancellationToken ct) => service.ListCommentsAsync(entryId, User.ToCurrentUser(), ct);
    [HttpPost("entries/{entryId:guid}/comments")] public Task<CommentDto> Add(Guid entryId, AddCommentRequest request, CancellationToken ct) => service.AddCommentAsync(entryId, request, User.ToCurrentUser(), ct);
    [HttpPut("comments/{id:guid}")] public Task<CommentDto> Edit(Guid id, EditCommentRequest request, CancellationToken ct) => service.EditCommentAsync(id, request, User.ToCurrentUser(), ct);
    [HttpDelete("comments/{id:guid}")] public async Task<IActionResult> Delete(Guid id, CancellationToken ct) { await service.DeleteCommentAsync(id, User.ToCurrentUser(), ct); return NoContent(); }
}

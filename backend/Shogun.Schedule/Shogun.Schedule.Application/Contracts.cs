using Shogun.Schedule.Domain;

namespace Shogun.Schedule.Application;

public sealed record CurrentUser(string UserId, string? Email, string DisplayName, bool IsAdmin, string Role);
public sealed record ScheduleSummaryDto(Guid Id, string FacultyCode, string FacultyName, string AcademicYear, int SemesterNumber, StudyMode StudyMode, string Name, ScheduleStatus Status, Guid ConcurrencyToken, DateTimeOffset UpdatedAt, string? UpdatedBy);
public sealed record GroupDto(Guid Id, string Code, string Name, int SortOrder, Guid ConcurrencyToken);
public sealed record EntryDto(Guid Id, string? SubjectSource, string? SubjectExternalId, string? SubjectCode, string SubjectName, ClassType ClassType, string? LecturerUserId, string? LecturerEmail, string LecturerDisplayName, string? Room, int DayOfWeek, int StartMinute, int DurationMinutes, string? Color, IReadOnlyList<Guid> GroupIds, Guid ConcurrencyToken, int CommentCount);
public sealed record ScheduleDto(Guid Id, string FacultyCode, string FacultyName, string AcademicYear, int SemesterNumber, StudyMode StudyMode, string Name, ScheduleStatus Status, Guid ConcurrencyToken, DateTimeOffset UpdatedAt, string? UpdatedBy, IReadOnlyList<GroupDto> Groups, IReadOnlyList<EntryDto> Entries);
public sealed record CreateScheduleRequest(string FacultyCode, string AcademicYear, int SemesterNumber, StudyMode StudyMode, string Name);
public sealed record SaveGroupRequest(Guid Id, string Code, string Name, int SortOrder);
public sealed record SaveEntryRequest(Guid Id, string? SubjectSource, string? SubjectExternalId, string? SubjectCode, string SubjectName, ClassType ClassType, string LecturerUserId, string? LecturerEmail, string LecturerDisplayName, string? Room, int DayOfWeek, int StartMinute, int DurationMinutes, string? Color, IReadOnlyList<Guid> GroupIds);
public sealed record SaveScheduleRequest(Guid ConcurrencyToken, string Name, ScheduleStatus Status, IReadOnlyList<SaveGroupRequest> Groups, IReadOnlyList<SaveEntryRequest> Entries);
public sealed record DeleteScheduleRequest(Guid ConcurrencyToken);
public sealed record CommentDto(Guid Id, Guid ScheduleEntryId, string Body, string? AuthorUserId, string? AuthorEmail, string AuthorDisplayName, string AuthorRole, DateTimeOffset CreatedAt, DateTimeOffset? UpdatedAt, bool CanEdit, bool CanDelete);
public sealed record AddCommentRequest(string Body);
public sealed record EditCommentRequest(string Body);

public sealed class NotFoundException(string message) : Exception(message);
public sealed class ConflictException(string message) : Exception(message);
public sealed class ValidationException(string message) : Exception(message);

public interface IScheduleRepository
{
    Task<Faculty?> FindFacultyAsync(string code, CancellationToken ct);
    Task<IReadOnlyList<SchedulePlan>> ListAsync(string? facultyCode, string? academicYear, CancellationToken ct);
    Task<SchedulePlan?> GetAsync(Guid id, bool tracking, CancellationToken ct);
    Task AddAsync(SchedulePlan schedule, CancellationToken ct);
    Task AddEntryAsync(ScheduleEntry entry, CancellationToken ct);
    Task AddCommentAsync(ScheduleComment comment, CancellationToken ct);
    Task DeleteAsync(SchedulePlan schedule, CancellationToken ct);
    Task<ScheduleComment?> GetCommentAsync(Guid id, CancellationToken ct);
    Task<ScheduleEntry?> GetEntryAsync(Guid id, CancellationToken ct);
    Task<IReadOnlyList<SchedulePlan>> ListPublishedForSelectionAsync(Guid facultyId, string academicYear, int semesterNumber, StudyMode studyMode, Guid exceptScheduleId, CancellationToken ct);
    Task SaveChangesAsync(CancellationToken ct);
    Task<IScheduleLock> LockScheduleAsync(Guid scheduleId, CancellationToken ct);
    Task<IScheduleLock> LockFacultyAsync(Guid facultyId, CancellationToken ct);
}

public interface IScheduleLock : IAsyncDisposable { Task CompleteAsync(CancellationToken ct); }

public interface IScheduleService
{
    Task<IReadOnlyList<ScheduleSummaryDto>> ListAsync(string? facultyCode, string? academicYear, CancellationToken ct);
    Task<IReadOnlyList<ScheduleSummaryDto>> ListPublishedAsync(string? facultyCode, string? academicYear, CancellationToken ct);
    Task<ScheduleDto> GetAsync(Guid id, CancellationToken ct);
    Task<ScheduleDto> GetPublishedAsync(Guid id, CancellationToken ct);
    Task<ScheduleDto> CreateAsync(CreateScheduleRequest request, CurrentUser user, CancellationToken ct);
    Task<ScheduleDto> SaveAsync(Guid id, SaveScheduleRequest request, CurrentUser user, CancellationToken ct);
    Task DeleteAsync(Guid id, DeleteScheduleRequest request, CancellationToken ct);
    Task<IReadOnlyList<CommentDto>> ListCommentsAsync(Guid entryId, CurrentUser user, CancellationToken ct);
    Task<CommentDto> AddCommentAsync(Guid entryId, AddCommentRequest request, CurrentUser user, CancellationToken ct);
    Task<CommentDto> EditCommentAsync(Guid id, EditCommentRequest request, CurrentUser user, CancellationToken ct);
    Task DeleteCommentAsync(Guid id, CurrentUser user, CancellationToken ct);
}

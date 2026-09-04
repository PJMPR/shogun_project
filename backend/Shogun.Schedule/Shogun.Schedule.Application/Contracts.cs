using Shogun.Schedule.Domain;

namespace Shogun.Schedule.Application;

public sealed record CurrentUser(string UserId, string? Email, string DisplayName, bool IsAdmin, string Role);
public sealed record ScheduleSummaryDto(Guid Id, string FacultyCode, string FacultyName, string AcademicYear, int SemesterNumber, StudyMode StudyMode, string Name, ScheduleStatus Status, Guid ConcurrencyToken, DateTimeOffset UpdatedAt, string? UpdatedBy);
public sealed record GroupDto(Guid Id, string Code, string Name, int SortOrder, Guid ConcurrencyToken);
public sealed record EntryDto(Guid Id, string? SubjectSource, string? SubjectExternalId, string? SubjectCode, string SubjectName, ClassType ClassType, string? LecturerUserId, string? LecturerEmail, string LecturerDisplayName, string? Room, int DayOfWeek, int StartMinute, int DurationMinutes, string? Color, IReadOnlyList<string> Dates, int? MeetingCountOverride, int? StaffingLessonHoursOverride, bool HiddenInPublished, bool CommentThreadClosed, IReadOnlyList<Guid> GroupIds, Guid ConcurrencyToken, int CommentCount);
public sealed record ScheduleSubjectDto(Guid Id, string Code, string Name);
public sealed record ScheduleLecturerDto(Guid Id, string DisplayName, string? Email);
public sealed record ScheduleSubjectLecturerDto(Guid Id, string SubjectCode, string LecturerKey, string LecturerDisplayName, string? LecturerUserId, string? LecturerEmail, int? LecturerAssignmentId);
public sealed record ScheduleDto(Guid Id, string FacultyCode, string FacultyName, string AcademicYear, int SemesterNumber, StudyMode StudyMode, string Name, ScheduleStatus Status, Guid ConcurrencyToken, DateTimeOffset UpdatedAt, string? UpdatedBy, IReadOnlyList<GroupDto> Groups, IReadOnlyList<EntryDto> Entries, IReadOnlyList<ScheduleSubjectDto> Subjects, IReadOnlyList<ScheduleLecturerDto> Lecturers, IReadOnlyList<ScheduleSubjectLecturerDto> SubjectLecturers);
public sealed record CreateScheduleRequest(string FacultyCode, string AcademicYear, int SemesterNumber, StudyMode StudyMode, string Name);
public sealed record SaveGroupRequest(Guid Id, string Code, string Name, int SortOrder);
public sealed record SaveEntryRequest(Guid Id, string? SubjectSource, string? SubjectExternalId, string? SubjectCode, string SubjectName, ClassType ClassType, string? LecturerUserId, string? LecturerEmail, string? LecturerDisplayName, string? Room, int DayOfWeek, int StartMinute, int DurationMinutes, string? Color, IReadOnlyList<Guid> GroupIds, IReadOnlyList<string>? Dates = null, int? MeetingCountOverride = null, int? StaffingLessonHoursOverride = null, bool HiddenInPublished = false);
public sealed record SaveScheduleRequest(Guid ConcurrencyToken, string Name, ScheduleStatus Status, IReadOnlyList<SaveGroupRequest> Groups, IReadOnlyList<SaveEntryRequest> Entries);
public sealed record DeleteScheduleRequest(Guid ConcurrencyToken);
public sealed record RecipientDto(string UserId, string DisplayName, string? Email);
public sealed record DirectoryUser(string UserId, string DisplayName, string? Email, bool HasEmail);
public sealed record CommentDto(Guid Id, Guid ScheduleEntryId, string Body, string? AuthorUserId, string? AuthorEmail, string AuthorDisplayName, string AuthorRole, DateTimeOffset CreatedAt, DateTimeOffset? UpdatedAt, bool CanEdit, bool CanDelete, IReadOnlyList<RecipientDto> Recipients);
public sealed record AddCommentRequest(string Body, IReadOnlyList<string>? MentionedUserIds = null);
public sealed record EditCommentRequest(string Body, IReadOnlyList<string>? MentionedUserIds = null);
public sealed record SetCommentThreadStatusRequest(bool Closed);
public sealed record CommentThreadStatusDto(Guid ScheduleEntryId, bool Closed);
public sealed record SaveScheduleSubjectRequest(string Code, string Name);
public sealed record SaveScheduleLecturerRequest(string DisplayName, string? Email);
public sealed record AddScheduleSubjectLecturerRequest(string SubjectCode, string LecturerKey, string LecturerDisplayName, string? LecturerUserId, string? LecturerEmail, int? LecturerAssignmentId);
public sealed record NoteDto(Guid Id, Guid ScheduleId, string? Title, string Body, string? AuthorUserId, string? AuthorEmail, string AuthorDisplayName, string AuthorRole, DateTimeOffset CreatedAt, DateTimeOffset? UpdatedAt, bool CanEdit, bool CanDelete, IReadOnlyList<RecipientDto> Recipients);
public sealed record AddNoteRequest(string Body, string? Title, IReadOnlyList<string>? MentionedUserIds = null);
public sealed record EditNoteRequest(string Body, string? Title, IReadOnlyList<string>? MentionedUserIds = null);

public sealed class NotFoundException(string message) : Exception(message);
public sealed class ConflictException(string message) : Exception(message);
public sealed class ValidationException(string message) : Exception(message);

public interface IScheduleRepository
{
    Task<Faculty?> FindFacultyAsync(string code, CancellationToken ct);
    Task<IReadOnlyList<SchedulePlan>> ListAsync(string? facultyCode, string? academicYear, CancellationToken ct);
    Task<SchedulePlan?> GetAsync(Guid id, bool tracking, CancellationToken ct);
    Task AddAsync(SchedulePlan schedule, CancellationToken ct);
    Task AddGroupAsync(StudentGroup group, CancellationToken ct);
    Task AddEntryAsync(ScheduleEntry entry, CancellationToken ct);
    Task AddCommentAsync(ScheduleComment comment, CancellationToken ct);
    Task AddSubjectAsync(ScheduleSubject subject, CancellationToken ct);
    Task AddLecturerAsync(ScheduleLecturer lecturer, CancellationToken ct);
    Task AddSubjectLecturerAsync(ScheduleSubjectLecturer item, CancellationToken ct);
    Task AddNoteAsync(ScheduleNote note, CancellationToken ct);
    Task DeleteAsync(SchedulePlan schedule, CancellationToken ct);
    Task<ScheduleComment?> GetCommentAsync(Guid id, CancellationToken ct);
    Task<ScheduleEntry?> GetEntryAsync(Guid id, CancellationToken ct);
    Task<ScheduleNote?> GetNoteAsync(Guid id, CancellationToken ct);
    Task<IReadOnlyList<SchedulePlan>> ListPublishedForSelectionAsync(Guid facultyId, string academicYear, int semesterNumber, StudyMode studyMode, Guid exceptScheduleId, CancellationToken ct);
    Task SaveChangesAsync(CancellationToken ct);
    Task<IScheduleLock> LockScheduleAsync(Guid scheduleId, CancellationToken ct);
    Task<IScheduleLock> LockFacultyAsync(Guid facultyId, CancellationToken ct);
}

public interface IScheduleLock : IAsyncDisposable { Task CompleteAsync(CancellationToken ct); }

public interface IUserDirectory
{
    Task<IReadOnlyList<DirectoryUser>> ResolveAsync(IReadOnlyList<string> userIds, CancellationToken ct);
}

public sealed record MentionNotification(
    string Kind,
    string AuthorDisplayName,
    string Heading,
    string Body,
    string ScheduleName,
    Guid ScheduleId,
    IReadOnlyList<DirectoryUser> Recipients);

public interface IMentionNotifier
{
    Task NotifyAsync(MentionNotification notification, CancellationToken ct);
}

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
    Task<CommentThreadStatusDto> SetCommentThreadStatusAsync(Guid entryId, SetCommentThreadStatusRequest request, CurrentUser user, CancellationToken ct);
    Task<ScheduleSubjectDto> AddSubjectAsync(Guid scheduleId, SaveScheduleSubjectRequest request, CurrentUser user, CancellationToken ct);
    Task<ScheduleSubjectDto> UpdateSubjectAsync(Guid scheduleId, Guid subjectId, SaveScheduleSubjectRequest request, CurrentUser user, CancellationToken ct);
    Task DeleteSubjectAsync(Guid scheduleId, Guid subjectId, CancellationToken ct);
    Task<ScheduleLecturerDto> AddLecturerAsync(Guid scheduleId, SaveScheduleLecturerRequest request, CurrentUser user, CancellationToken ct);
    Task<ScheduleLecturerDto> UpdateLecturerAsync(Guid scheduleId, Guid lecturerId, SaveScheduleLecturerRequest request, CurrentUser user, CancellationToken ct);
    Task DeleteLecturerAsync(Guid scheduleId, Guid lecturerId, CancellationToken ct);
    Task<ScheduleSubjectLecturerDto> AddSubjectLecturerAsync(Guid scheduleId, AddScheduleSubjectLecturerRequest request, CurrentUser user, CancellationToken ct);
    Task DeleteSubjectLecturerAsync(Guid scheduleId, Guid assignmentId, CancellationToken ct);
    Task<IReadOnlyList<NoteDto>> ListNotesAsync(Guid scheduleId, CurrentUser user, CancellationToken ct);
    Task<NoteDto> AddNoteAsync(Guid scheduleId, AddNoteRequest request, CurrentUser user, CancellationToken ct);
    Task<NoteDto> EditNoteAsync(Guid id, EditNoteRequest request, CurrentUser user, CancellationToken ct);
    Task DeleteNoteAsync(Guid id, CurrentUser user, CancellationToken ct);
}

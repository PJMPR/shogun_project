namespace Shogun.Schedule.Domain;

public enum StudyMode { Stationary = 1, PartTime = 2 }
public enum ScheduleStatus { Draft = 1, Published = 2 }
public enum ClassType { Lecture = 1, Exercises = 2, Laboratory = 3, Project = 4, Seminar = 5, Other = 6 }

public sealed class Faculty
{
    public Guid Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public DateTimeOffset CreatedAt { get; set; }
    public List<SchedulePlan> Schedules { get; set; } = [];
}

public sealed class SchedulePlan
{
    public Guid Id { get; set; }
    public Guid FacultyId { get; set; }
    public Faculty Faculty { get; set; } = null!;
    public string AcademicYear { get; set; } = string.Empty;
    public int SemesterNumber { get; set; }
    public StudyMode StudyMode { get; set; }
    public string Name { get; set; } = string.Empty;
    public ScheduleStatus Status { get; set; } = ScheduleStatus.Draft;
    public Guid ConcurrencyToken { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public string? CreatedBy { get; set; }
    public string? CreatedByUserId { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
    public string? UpdatedBy { get; set; }
    public string? UpdatedByUserId { get; set; }
    public List<StudentGroup> Groups { get; set; } = [];
    public List<ScheduleEntry> Entries { get; set; } = [];
}

public sealed class StudentGroup
{
    public Guid Id { get; set; }
    public Guid ScheduleId { get; set; }
    public SchedulePlan Schedule { get; set; } = null!;
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public int SortOrder { get; set; }
    public Guid ConcurrencyToken { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public string? CreatedBy { get; set; }
    public string? CreatedByUserId { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
    public string? UpdatedBy { get; set; }
    public string? UpdatedByUserId { get; set; }
    public List<ScheduleEntryGroup> EntryGroups { get; set; } = [];
}

public sealed class ScheduleEntry
{
    public Guid Id { get; set; }
    public Guid ScheduleId { get; set; }
    public SchedulePlan Schedule { get; set; } = null!;
    public string? SubjectSource { get; set; }
    public string? SubjectExternalId { get; set; }
    public string? SubjectCode { get; set; }
    public string SubjectName { get; set; } = string.Empty;
    public ClassType ClassType { get; set; }
    public string? LecturerUserId { get; set; }
    public string? LecturerEmail { get; set; }
    public string LecturerDisplayName { get; set; } = string.Empty;
    public string? Room { get; set; }
    public int DayOfWeek { get; set; }
    public int StartMinute { get; set; }
    public int DurationMinutes { get; set; }
    public string? Color { get; set; }
    public Guid ConcurrencyToken { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public string? CreatedBy { get; set; }
    public string? CreatedByUserId { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
    public string? UpdatedBy { get; set; }
    public string? UpdatedByUserId { get; set; }
    public List<ScheduleEntryGroup> EntryGroups { get; set; } = [];
    public List<ScheduleComment> Comments { get; set; } = [];
}

public sealed class ScheduleEntryGroup
{
    public Guid ScheduleEntryId { get; set; }
    public ScheduleEntry ScheduleEntry { get; set; } = null!;
    public Guid StudentGroupId { get; set; }
    public StudentGroup StudentGroup { get; set; } = null!;
}

public sealed class ScheduleComment
{
    public Guid Id { get; set; }
    public Guid ScheduleEntryId { get; set; }
    public ScheduleEntry ScheduleEntry { get; set; } = null!;
    public string Body { get; set; } = string.Empty;
    public string? AuthorUserId { get; set; }
    public string? AuthorEmail { get; set; }
    public string AuthorDisplayName { get; set; } = string.Empty;
    public string AuthorRole { get; set; } = string.Empty;
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset? UpdatedAt { get; set; }
    public DateTimeOffset? DeletedAt { get; set; }
    public string? DeletedBy { get; set; }
    public string? DeletedByUserId { get; set; }
}

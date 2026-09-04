using Shogun.Schedule.Application;
using Shogun.Schedule.Domain;
using Xunit;

namespace Shogun.Schedule.Application.Tests;

public sealed class ScheduleServiceTests
{
    private static readonly CurrentUser User = new("kc-planner-id", "planner@example.edu", "Planista", false, "planner");

    [Fact]
    public async Task Save_rejects_stale_concurrency_token()
    {
        var repository = new FakeRepository(CreateSchedule());
        var service = new ScheduleService(repository);
        var request = EmptySave(Guid.NewGuid(), repository.Schedule.Groups);
        await Assert.ThrowsAsync<ConflictException>(() => service.SaveAsync(repository.Schedule.Id, request, User, default));
    }

    [Fact]
    public async Task Save_rejects_entries_overlapping_for_the_same_group()
    {
        var repository = new FakeRepository(CreateSchedule());
        var service = new ScheduleService(repository);
        var group = repository.Schedule.Groups[0];
        var entries = new[]
        {
            Entry(Guid.NewGuid(), group.Id, 540, 90), Entry(Guid.NewGuid(), group.Id, 600, 90),
        };
        var request = EmptySave(repository.Schedule.ConcurrencyToken, repository.Schedule.Groups) with { Entries = entries };
        await Assert.ThrowsAsync<ValidationException>(() => service.SaveAsync(repository.Schedule.Id, request, User, default));
    }

    [Fact]
    public async Task Save_allows_adjacent_entries_and_rotates_token()
    {
        var repository = new FakeRepository(CreateSchedule());
        var service = new ScheduleService(repository);
        var oldToken = repository.Schedule.ConcurrencyToken;
        var group = repository.Schedule.Groups[0];
        var request = EmptySave(oldToken, repository.Schedule.Groups) with { Entries = new[] { Entry(Guid.NewGuid(), group.Id, 540, 60), Entry(Guid.NewGuid(), group.Id, 600, 60) } };
        var result = await service.SaveAsync(repository.Schedule.Id, request, User, default);
        Assert.NotEqual(oldToken, result.ConcurrencyToken);
        Assert.Equal(2, result.Entries.Count);
    }

    [Fact]
    public async Task Save_marks_client_generated_group_as_new()
    {
        var repository = new FakeRepository(CreateSchedule());
        var service = new ScheduleService(repository);
        var newGroup = new SaveGroupRequest(Guid.NewGuid(), "G2", "Gr. 2", 1);
        var request = EmptySave(repository.Schedule.ConcurrencyToken, repository.Schedule.Groups) with
        {
            Groups = [.. EmptySave(repository.Schedule.ConcurrencyToken, repository.Schedule.Groups).Groups, newGroup],
        };

        var result = await service.SaveAsync(repository.Schedule.Id, request, User, default);

        Assert.Contains(result.Groups, group => group.Id == newGroup.Id);
        Assert.Contains(newGroup.Id, repository.AddedGroupIds);
    }

    [Fact]
    public async Task Publishing_plan_withdraws_previous_publication_for_same_selection()
    {
        var repository = new FakeRepository(CreateSchedule());
        var previous = CreateSchedule();
        previous.FacultyId = repository.Schedule.FacultyId;
        previous.Status = ScheduleStatus.Published;
        repository.PublishedPlans.Add(previous);
        var request = EmptySave(repository.Schedule.ConcurrencyToken, repository.Schedule.Groups) with { Status = ScheduleStatus.Published };

        var result = await new ScheduleService(repository).SaveAsync(repository.Schedule.Id, request, User, default);

        Assert.Equal(ScheduleStatus.Published, result.Status);
        Assert.Equal(ScheduleStatus.Draft, previous.Status);
    }

    [Fact]
    public async Task Planner_can_add_comment_to_a_draft_plan()
    {
        var schedule = CreateSchedule();
        var entry = new ScheduleEntry { Id = Guid.NewGuid(), ScheduleId = schedule.Id, Schedule = schedule };
        schedule.Entries.Add(entry);
        var repository = new FakeRepository(schedule);

        var result = await new ScheduleService(repository).AddCommentAsync(entry.Id, new AddCommentRequest("Test"), User, default);

        Assert.True(repository.CommentAdded);
        Assert.Equal(entry.Id, result.ScheduleEntryId);
        Assert.Equal("Test", result.Body);
    }

    [Fact]
    public async Task Adding_comment_notifies_mentioned_users()
    {
        var schedule = CreateSchedule();
        var entry = new ScheduleEntry { Id = Guid.NewGuid(), ScheduleId = schedule.Id, Schedule = schedule, SubjectName = "Programowanie" };
        schedule.Entries.Add(entry);
        var repository = new FakeRepository(schedule);
        var directory = new FakeUserDirectory(
            new DirectoryUser("recipient-1", "Jan Kowalski", "jan@example.edu", true));
        var notifier = new FakeMentionNotifier();

        await new ScheduleService(repository, directory, notifier)
            .AddCommentAsync(entry.Id, new AddCommentRequest("Proszę sprawdzić zmianę.", ["recipient-1"]), User, default);

        var notification = Assert.Single(notifier.Notifications);
        Assert.Equal("comment", notification.Kind);
        Assert.Equal("jan@example.edu", Assert.Single(notification.Recipients).Email);
        Assert.Equal(schedule.Id, notification.ScheduleId);
    }

    [Fact]
    public async Task Editing_note_notifies_only_newly_mentioned_users()
    {
        var schedule = CreateSchedule();
        var note = new ScheduleNote
        {
            Id = Guid.NewGuid(), ScheduleId = schedule.Id, Schedule = schedule, Body = "Notatka",
            AuthorUserId = User.UserId, AuthorDisplayName = User.DisplayName, AuthorRole = User.Role,
        };
        note.Recipients.Add(new ScheduleNoteRecipient
        {
            Id = Guid.NewGuid(), ScheduleNoteId = note.Id, ScheduleNote = note,
            RecipientUserId = "recipient-1", RecipientDisplayName = "Jan Kowalski",
            RecipientEmail = "jan@example.edu",
        });
        schedule.Notes.Add(note);
        var repository = new FakeRepository(schedule);
        var directory = new FakeUserDirectory(
            new DirectoryUser("recipient-1", "Jan Kowalski", "jan@example.edu", true),
            new DirectoryUser("recipient-2", "Anna Nowak", "anna@example.edu", true));
        var notifier = new FakeMentionNotifier();

        await new ScheduleService(repository, directory, notifier)
            .EditNoteAsync(note.Id, new EditNoteRequest("Zmieniona notatka", null, ["recipient-1", "recipient-2"]), User, default);

        var notification = Assert.Single(notifier.Notifications);
        Assert.Equal("note", notification.Kind);
        Assert.Equal("recipient-2", Assert.Single(notification.Recipients).UserId);
    }

    [Fact]
    public async Task Lecturer_cannot_add_comment_to_a_draft_plan()
    {
        var schedule = CreateSchedule();
        var entry = new ScheduleEntry { Id = Guid.NewGuid(), ScheduleId = schedule.Id, Schedule = schedule };
        schedule.Entries.Add(entry);
        var repository = new FakeRepository(schedule);
        var lecturer = new CurrentUser("kc-lecturer-id", "lecturer@example.edu", "Wykładowca", false, "lecturer");

        await Assert.ThrowsAsync<UnauthorizedAccessException>(() =>
            new ScheduleService(repository).AddCommentAsync(entry.Id, new AddCommentRequest("Test"), lecturer, default));
    }

    [Fact]
    public async Task Lecturer_can_list_comments_of_a_published_plan()
    {
        var schedule = CreateSchedule();
        schedule.Status = ScheduleStatus.Published;
        var entry = new ScheduleEntry { Id = Guid.NewGuid(), ScheduleId = schedule.Id, Schedule = schedule };
        entry.Comments.Add(new ScheduleComment
        {
            Id = Guid.NewGuid(),
            ScheduleEntryId = entry.Id,
            ScheduleEntry = entry,
            Body = "Widoczny komentarz",
            AuthorUserId = "planner-id",
            AuthorDisplayName = "Planista",
            AuthorRole = "planner",
        });
        schedule.Entries.Add(entry);
        var lecturer = new CurrentUser("kc-lecturer-id", "lecturer@example.edu", "Wykładowca", false, "lecturer");

        var result = await new ScheduleService(new FakeRepository(schedule))
            .ListCommentsAsync(entry.Id, lecturer, default);

        Assert.Equal("Widoczny komentarz", Assert.Single(result).Body);
    }

    [Fact]
    public async Task Delete_lecturer_rejects_lecturer_assigned_to_an_entry()
    {
        var schedule = CreateSchedule();
        var lecturer = new ScheduleLecturer { Id = Guid.NewGuid(), ScheduleId = schedule.Id, Schedule = schedule, DisplayName = "Jan Kowalski", Email = "jan@example.edu" };
        schedule.Lecturers.Add(lecturer);
        schedule.Entries.Add(new ScheduleEntry { Id = Guid.NewGuid(), ScheduleId = schedule.Id, Schedule = schedule, LecturerDisplayName = lecturer.DisplayName, LecturerEmail = lecturer.Email });

        await Assert.ThrowsAsync<ConflictException>(() =>
            new ScheduleService(new FakeRepository(schedule)).DeleteLecturerAsync(schedule.Id, lecturer.Id, default));
    }

    [Fact]
    public async Task Delete_lecturer_removes_unassigned_lecturer()
    {
        var schedule = CreateSchedule();
        var lecturer = new ScheduleLecturer { Id = Guid.NewGuid(), ScheduleId = schedule.Id, Schedule = schedule, DisplayName = "Jan Kowalski" };
        schedule.Lecturers.Add(lecturer);

        await new ScheduleService(new FakeRepository(schedule)).DeleteLecturerAsync(schedule.Id, lecturer.Id, default);

        Assert.DoesNotContain(lecturer, schedule.Lecturers);
    }

    private static SaveScheduleRequest EmptySave(Guid token, IReadOnlyList<StudentGroup> groups) => new(token, "Plan", ScheduleStatus.Draft, groups.Select(g => new SaveGroupRequest(g.Id, g.Code, g.Name, g.SortOrder)).ToList(), []);
    private static SaveEntryRequest Entry(Guid id, Guid groupId, int start, int duration) => new(id, null, null, "TST", "Test", ClassType.Laboratory, "kc-lecturer-id", "lecturer@example.edu", "Wykładowca", null, 0, start, duration, null, [groupId]);
    private static SchedulePlan CreateSchedule()
    {
        var id = Guid.NewGuid(); var now = DateTimeOffset.UtcNow;
        return new SchedulePlan { Id = id, Faculty = new Faculty { Id = Guid.NewGuid(), Code = "WI", Name = "Wydział Informatyki" }, AcademicYear = "2026/2027", SemesterNumber = 1, StudyMode = StudyMode.Stationary, Name = "Plan", ConcurrencyToken = Guid.NewGuid(), CreatedAt = now, UpdatedAt = now, CreatedBy = User.Email, UpdatedBy = User.Email, Groups = [new StudentGroup { Id = Guid.NewGuid(), ScheduleId = id, Code = "G1", Name = "Gr. 1", SortOrder = 0, ConcurrencyToken = Guid.NewGuid(), CreatedAt = now, UpdatedAt = now, CreatedBy = User.Email, UpdatedBy = User.Email }] };
    }

    private sealed class FakeRepository(SchedulePlan schedule) : IScheduleRepository
    {
        public SchedulePlan Schedule { get; } = schedule;
        public List<SchedulePlan> PublishedPlans { get; } = [];
        public bool CommentAdded { get; private set; }
        public List<Guid> AddedGroupIds { get; } = [];
        public Task<Faculty?> FindFacultyAsync(string code, CancellationToken ct) => Task.FromResult<Faculty?>(Schedule.Faculty);
        public Task<IReadOnlyList<SchedulePlan>> ListAsync(string? facultyCode, string? academicYear, CancellationToken ct) => Task.FromResult<IReadOnlyList<SchedulePlan>>([Schedule]);
        public Task<SchedulePlan?> GetAsync(Guid id, bool tracking, CancellationToken ct) => Task.FromResult<SchedulePlan?>(id == Schedule.Id ? Schedule : null);
        public Task AddAsync(SchedulePlan value, CancellationToken ct) => Task.CompletedTask;
        public Task AddGroupAsync(StudentGroup group, CancellationToken ct) { AddedGroupIds.Add(group.Id); return Task.CompletedTask; }
        public Task AddEntryAsync(ScheduleEntry entry, CancellationToken ct) => Task.CompletedTask;
        public Task AddCommentAsync(ScheduleComment comment, CancellationToken ct) { CommentAdded = true; return Task.CompletedTask; }
        public Task AddSubjectAsync(ScheduleSubject subject, CancellationToken ct) => Task.CompletedTask;
        public Task AddLecturerAsync(ScheduleLecturer lecturer, CancellationToken ct) => Task.CompletedTask;
        public Task AddSubjectLecturerAsync(ScheduleSubjectLecturer item, CancellationToken ct) => Task.CompletedTask;
        public Task AddNoteAsync(ScheduleNote note, CancellationToken ct) => Task.CompletedTask;
        public Task DeleteAsync(SchedulePlan value, CancellationToken ct) => Task.CompletedTask;
        public Task<ScheduleComment?> GetCommentAsync(Guid id, CancellationToken ct) => Task.FromResult<ScheduleComment?>(null);
        public Task<ScheduleEntry?> GetEntryAsync(Guid id, CancellationToken ct) => Task.FromResult(Schedule.Entries.FirstOrDefault(x => x.Id == id));
        public Task<ScheduleNote?> GetNoteAsync(Guid id, CancellationToken ct) => Task.FromResult(Schedule.Notes.FirstOrDefault(x => x.Id == id));
        public Task<IReadOnlyList<SchedulePlan>> ListPublishedForSelectionAsync(Guid facultyId, string academicYear, int semesterNumber, StudyMode studyMode, Guid exceptScheduleId, CancellationToken ct) => Task.FromResult<IReadOnlyList<SchedulePlan>>(PublishedPlans.Where(x => x.FacultyId == facultyId && x.AcademicYear == academicYear && x.SemesterNumber == semesterNumber && x.StudyMode == studyMode && x.Id != exceptScheduleId && x.Status == ScheduleStatus.Published).ToList());
        public Task SaveChangesAsync(CancellationToken ct) => Task.CompletedTask;
        public Task<IScheduleLock> LockScheduleAsync(Guid scheduleId, CancellationToken ct) => Task.FromResult<IScheduleLock>(new FakeLock());
        public Task<IScheduleLock> LockFacultyAsync(Guid facultyId, CancellationToken ct) => Task.FromResult<IScheduleLock>(new FakeLock());
    }
    private sealed class FakeLock : IScheduleLock { public Task CompleteAsync(CancellationToken ct) => Task.CompletedTask; public ValueTask DisposeAsync() => ValueTask.CompletedTask; }
    private sealed class FakeUserDirectory(params DirectoryUser[] users) : IUserDirectory
    {
        public Task<IReadOnlyList<DirectoryUser>> ResolveAsync(IReadOnlyList<string> userIds, CancellationToken ct) =>
            Task.FromResult<IReadOnlyList<DirectoryUser>>(users.Where(x => userIds.Contains(x.UserId)).ToList());
    }
    private sealed class FakeMentionNotifier : IMentionNotifier
    {
        public List<MentionNotification> Notifications { get; } = [];
        public Task NotifyAsync(MentionNotification notification, CancellationToken ct)
        {
            if (notification.Recipients.Count > 0) Notifications.Add(notification);
            return Task.CompletedTask;
        }
    }
}

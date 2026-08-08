using Shogun.Schedule.Application;
using Shogun.Schedule.Domain;
using Xunit;

namespace Shogun.Schedule.Application.Tests;

public sealed class ScheduleServiceTests
{
    private static readonly CurrentUser User = new("planner@example.edu", "Planista", false, "planner");

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
    public async Task Add_comment_registers_a_new_comment_for_insert()
    {
        var schedule = CreateSchedule();
        schedule.Status = ScheduleStatus.Published;
        var entry = new ScheduleEntry { Id = Guid.NewGuid(), ScheduleId = schedule.Id, Schedule = schedule };
        schedule.Entries.Add(entry);
        var repository = new FakeRepository(schedule);

        var result = await new ScheduleService(repository).AddCommentAsync(entry.Id, new AddCommentRequest("Test"), User, default);

        Assert.True(repository.CommentAdded);
        Assert.Equal(entry.Id, result.ScheduleEntryId);
        Assert.Equal("Test", result.Body);
    }

    private static SaveScheduleRequest EmptySave(Guid token, IReadOnlyList<StudentGroup> groups) => new(token, "Plan", ScheduleStatus.Draft, groups.Select(g => new SaveGroupRequest(g.Id, g.Code, g.Name, g.SortOrder)).ToList(), []);
    private static SaveEntryRequest Entry(Guid id, Guid groupId, int start, int duration) => new(id, null, null, "TST", "Test", ClassType.Laboratory, "lecturer@example.edu", "Wykładowca", null, 0, start, duration, null, [groupId]);
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
        public Task<Faculty?> FindFacultyAsync(string code, CancellationToken ct) => Task.FromResult<Faculty?>(Schedule.Faculty);
        public Task<IReadOnlyList<SchedulePlan>> ListAsync(string? facultyCode, string? academicYear, CancellationToken ct) => Task.FromResult<IReadOnlyList<SchedulePlan>>([Schedule]);
        public Task<SchedulePlan?> GetAsync(Guid id, bool tracking, CancellationToken ct) => Task.FromResult<SchedulePlan?>(id == Schedule.Id ? Schedule : null);
        public Task AddAsync(SchedulePlan value, CancellationToken ct) => Task.CompletedTask;
        public Task AddEntryAsync(ScheduleEntry entry, CancellationToken ct) => Task.CompletedTask;
        public Task AddCommentAsync(ScheduleComment comment, CancellationToken ct) { CommentAdded = true; return Task.CompletedTask; }
        public Task DeleteAsync(SchedulePlan value, CancellationToken ct) => Task.CompletedTask;
        public Task<ScheduleComment?> GetCommentAsync(Guid id, CancellationToken ct) => Task.FromResult<ScheduleComment?>(null);
        public Task<ScheduleEntry?> GetEntryAsync(Guid id, CancellationToken ct) => Task.FromResult(Schedule.Entries.FirstOrDefault(x => x.Id == id));
        public Task<IReadOnlyList<SchedulePlan>> ListPublishedForSelectionAsync(Guid facultyId, string academicYear, int semesterNumber, StudyMode studyMode, Guid exceptScheduleId, CancellationToken ct) => Task.FromResult<IReadOnlyList<SchedulePlan>>(PublishedPlans.Where(x => x.FacultyId == facultyId && x.AcademicYear == academicYear && x.SemesterNumber == semesterNumber && x.StudyMode == studyMode && x.Id != exceptScheduleId && x.Status == ScheduleStatus.Published).ToList());
        public Task SaveChangesAsync(CancellationToken ct) => Task.CompletedTask;
        public Task<IScheduleLock> LockScheduleAsync(Guid scheduleId, CancellationToken ct) => Task.FromResult<IScheduleLock>(new FakeLock());
        public Task<IScheduleLock> LockFacultyAsync(Guid facultyId, CancellationToken ct) => Task.FromResult<IScheduleLock>(new FakeLock());
    }
    private sealed class FakeLock : IScheduleLock { public Task CompleteAsync(CancellationToken ct) => Task.CompletedTask; public ValueTask DisposeAsync() => ValueTask.CompletedTask; }
}

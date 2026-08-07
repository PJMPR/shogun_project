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
        public Task<Faculty?> FindFacultyAsync(string code, CancellationToken ct) => Task.FromResult<Faculty?>(Schedule.Faculty);
        public Task<IReadOnlyList<SchedulePlan>> ListAsync(string? facultyCode, string? academicYear, CancellationToken ct) => Task.FromResult<IReadOnlyList<SchedulePlan>>([Schedule]);
        public Task<SchedulePlan?> GetAsync(Guid id, bool tracking, CancellationToken ct) => Task.FromResult<SchedulePlan?>(id == Schedule.Id ? Schedule : null);
        public Task AddAsync(SchedulePlan value, CancellationToken ct) => Task.CompletedTask;
        public Task AddEntryAsync(ScheduleEntry entry, CancellationToken ct) => Task.CompletedTask;
        public Task DeleteAsync(SchedulePlan value, CancellationToken ct) => Task.CompletedTask;
        public Task<ScheduleComment?> GetCommentAsync(Guid id, CancellationToken ct) => Task.FromResult<ScheduleComment?>(null);
        public Task<ScheduleEntry?> GetEntryAsync(Guid id, CancellationToken ct) => Task.FromResult<ScheduleEntry?>(null);
        public Task SaveChangesAsync(CancellationToken ct) => Task.CompletedTask;
        public Task<IScheduleLock> LockScheduleAsync(Guid scheduleId, CancellationToken ct) => Task.FromResult<IScheduleLock>(new FakeLock());
    }
    private sealed class FakeLock : IScheduleLock { public Task CompleteAsync(CancellationToken ct) => Task.CompletedTask; public ValueTask DisposeAsync() => ValueTask.CompletedTask; }
}

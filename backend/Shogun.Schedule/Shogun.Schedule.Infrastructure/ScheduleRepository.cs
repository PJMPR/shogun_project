using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using Shogun.Schedule.Application;
using Shogun.Schedule.Domain;

namespace Shogun.Schedule.Infrastructure;

public sealed class ScheduleRepository(ScheduleDbContext db) : IScheduleRepository
{
    public Task<Faculty?> FindFacultyAsync(string code, CancellationToken ct) => db.Faculties.FirstOrDefaultAsync(x => x.Code == code, ct);
    public async Task<IReadOnlyList<SchedulePlan>> ListAsync(string? facultyCode, string? academicYear, CancellationToken ct) => await db.Schedules.AsNoTracking().Include(x => x.Faculty).Where(x => (facultyCode == null || x.Faculty.Code == facultyCode) && (academicYear == null || x.AcademicYear == academicYear)).OrderByDescending(x => x.AcademicYear).ThenBy(x => x.SemesterNumber).ThenBy(x => x.StudyMode).ToListAsync(ct);
    public Task<SchedulePlan?> GetAsync(Guid id, bool tracking, CancellationToken ct)
    {
        IQueryable<SchedulePlan> query = db.Schedules.AsSplitQuery().Include(x => x.Faculty).Include(x => x.Groups).Include(x => x.Entries).ThenInclude(x => x.EntryGroups).Include(x => x.Entries).ThenInclude(x => x.Comments);
        if (!tracking) query = query.AsNoTracking();
        return query.FirstOrDefaultAsync(x => x.Id == id, ct);
    }
    public async Task AddAsync(SchedulePlan schedule, CancellationToken ct) => await db.Schedules.AddAsync(schedule, ct);
    public async Task AddGroupAsync(StudentGroup group, CancellationToken ct) => await db.StudentGroups.AddAsync(group, ct);
    public async Task AddEntryAsync(ScheduleEntry entry, CancellationToken ct) => await db.ScheduleEntries.AddAsync(entry, ct);
    public async Task AddCommentAsync(ScheduleComment comment, CancellationToken ct) => await db.ScheduleComments.AddAsync(comment, ct);
    public Task DeleteAsync(SchedulePlan schedule, CancellationToken ct) { db.Schedules.Remove(schedule); return Task.CompletedTask; }
    public Task<ScheduleComment?> GetCommentAsync(Guid id, CancellationToken ct) => db.ScheduleComments.Include(x => x.ScheduleEntry).ThenInclude(x => x.Schedule).FirstOrDefaultAsync(x => x.Id == id && x.DeletedAt == null, ct);
    public Task<ScheduleEntry?> GetEntryAsync(Guid id, CancellationToken ct) => db.ScheduleEntries.Include(x => x.Schedule).Include(x => x.Comments).FirstOrDefaultAsync(x => x.Id == id, ct);
    public async Task<IReadOnlyList<SchedulePlan>> ListPublishedForSelectionAsync(Guid facultyId, string academicYear, int semesterNumber, StudyMode studyMode, Guid exceptScheduleId, CancellationToken ct) => await db.Schedules.Where(x => x.FacultyId == facultyId && x.AcademicYear == academicYear && x.SemesterNumber == semesterNumber && x.StudyMode == studyMode && x.Id != exceptScheduleId && x.Status == ScheduleStatus.Published).ToListAsync(ct);
    public Task SaveChangesAsync(CancellationToken ct) => db.SaveChangesAsync(ct);
    public async Task<IScheduleLock> LockScheduleAsync(Guid scheduleId, CancellationToken ct)
    {
        var transaction = await db.Database.BeginTransactionAsync(ct);
        await db.Database.ExecuteSqlInterpolatedAsync($"SELECT pg_advisory_xact_lock(hashtext({scheduleId.ToString()}))", ct);
        return new ScheduleLock(transaction);
    }

    public async Task<IScheduleLock> LockFacultyAsync(Guid facultyId, CancellationToken ct)
    {
        var transaction = await db.Database.BeginTransactionAsync(ct);
        await db.Database.ExecuteSqlInterpolatedAsync($"SELECT pg_advisory_xact_lock(hashtext({facultyId.ToString()}))", ct);
        return new ScheduleLock(transaction);
    }

    private sealed class ScheduleLock(IDbContextTransaction transaction) : IScheduleLock
    {
        private bool completed;
        public async Task CompleteAsync(CancellationToken ct) { await transaction.CommitAsync(ct); completed = true; }
        public async ValueTask DisposeAsync() { if (!completed) await transaction.RollbackAsync(); await transaction.DisposeAsync(); }
    }
}

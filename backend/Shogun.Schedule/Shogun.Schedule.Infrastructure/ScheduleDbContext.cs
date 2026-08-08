using Microsoft.EntityFrameworkCore;
using Shogun.Schedule.Domain;

namespace Shogun.Schedule.Infrastructure;

public sealed class ScheduleDbContext(DbContextOptions<ScheduleDbContext> options) : DbContext(options)
{
    public DbSet<Faculty> Faculties => Set<Faculty>();
    public DbSet<SchedulePlan> Schedules => Set<SchedulePlan>();
    public DbSet<StudentGroup> StudentGroups => Set<StudentGroup>();
    public DbSet<ScheduleEntry> ScheduleEntries => Set<ScheduleEntry>();
    public DbSet<ScheduleEntryGroup> ScheduleEntryGroups => Set<ScheduleEntryGroup>();
    public DbSet<ScheduleComment> ScheduleComments => Set<ScheduleComment>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        b.HasPostgresEnum<StudyMode>(); b.HasPostgresEnum<ScheduleStatus>(); b.HasPostgresEnum<ClassType>();
        b.Entity<Faculty>(e =>
        {
            e.ToTable("faculties"); e.HasKey(x => x.Id); e.Property(x => x.Code).HasMaxLength(32); e.Property(x => x.Name).HasMaxLength(200);
            e.HasIndex(x => x.Code).IsUnique();
            e.HasData(
                new Faculty { Id = Guid.Parse("31e7c100-9d3f-4eb1-a388-c38f36b999a1"), Code = "WI", Name = "Informatyka", CreatedAt = new DateTimeOffset(2026, 1, 1, 0, 0, 0, TimeSpan.Zero) },
                new Faculty { Id = Guid.Parse("63c16df1-c743-41e0-b6da-8c67b19d5b1e"), Code = "SNM", Name = "Sztuka Nowych Mediów", CreatedAt = new DateTimeOffset(2026, 1, 1, 0, 0, 0, TimeSpan.Zero) });
        });
        b.Entity<SchedulePlan>(e =>
        {
            e.ToTable("schedules", t => { t.HasCheckConstraint("ck_schedules_semester", "\"SemesterNumber\" BETWEEN 1 AND 8"); t.HasCheckConstraint("ck_schedules_year", "\"AcademicYear\" ~ '^[0-9]{4}/[0-9]{4}$'"); });
            e.HasKey(x => x.Id); e.Property(x => x.AcademicYear).HasMaxLength(9); e.Property(x => x.Name).HasMaxLength(200); e.Property(x => x.CreatedBy).HasMaxLength(320); e.Property(x => x.UpdatedBy).HasMaxLength(320);
            e.Property(x => x.ConcurrencyToken).IsConcurrencyToken();
            e.HasIndex(x => new { x.FacultyId, x.AcademicYear, x.SemesterNumber, x.StudyMode }).IsUnique();
            e.HasOne(x => x.Faculty).WithMany(x => x.Schedules).HasForeignKey(x => x.FacultyId).OnDelete(DeleteBehavior.Restrict);
        });
        b.Entity<StudentGroup>(e =>
        {
            e.ToTable("student_groups"); e.HasKey(x => x.Id); e.Property(x => x.Code).HasMaxLength(64); e.Property(x => x.Name).HasMaxLength(120); e.Property(x => x.CreatedBy).HasMaxLength(320); e.Property(x => x.UpdatedBy).HasMaxLength(320); e.Property(x => x.ConcurrencyToken).IsConcurrencyToken();
            e.HasIndex(x => new { x.ScheduleId, x.Code }).IsUnique(); e.HasIndex(x => new { x.ScheduleId, x.SortOrder }).IsUnique();
            e.HasOne(x => x.Schedule).WithMany(x => x.Groups).HasForeignKey(x => x.ScheduleId).OnDelete(DeleteBehavior.Cascade);
        });
        b.Entity<ScheduleEntry>(e =>
        {
            e.ToTable("schedule_entries", t => { t.HasCheckConstraint("ck_entries_day", "\"DayOfWeek\" BETWEEN 0 AND 6"); t.HasCheckConstraint("ck_entries_time", "\"StartMinute\" >= 480 AND \"StartMinute\" + \"DurationMinutes\" <= 1200 AND \"StartMinute\" % 15 = 0 AND \"DurationMinutes\" > 0 AND \"DurationMinutes\" % 15 = 0"); });
            e.HasKey(x => x.Id); e.Property(x => x.SubjectSource).HasMaxLength(64); e.Property(x => x.SubjectExternalId).HasMaxLength(200); e.Property(x => x.SubjectCode).HasMaxLength(64); e.Property(x => x.SubjectName).HasMaxLength(300); e.Property(x => x.LecturerEmail).HasMaxLength(320); e.Property(x => x.LecturerDisplayName).HasMaxLength(200); e.Property(x => x.Room).HasMaxLength(120); e.Property(x => x.Color).HasMaxLength(7); e.Property(x => x.CreatedBy).HasMaxLength(320); e.Property(x => x.UpdatedBy).HasMaxLength(320); e.Property(x => x.ConcurrencyToken).IsConcurrencyToken();
            e.HasIndex(x => new { x.ScheduleId, x.DayOfWeek, x.StartMinute }); e.HasIndex(x => new { x.ScheduleId, x.LecturerEmail });
            e.HasOne(x => x.Schedule).WithMany(x => x.Entries).HasForeignKey(x => x.ScheduleId).OnDelete(DeleteBehavior.Cascade);
        });
        b.Entity<ScheduleEntryGroup>(e =>
        {
            e.ToTable("schedule_entry_groups"); e.HasKey(x => new { x.ScheduleEntryId, x.StudentGroupId });
            e.HasOne(x => x.ScheduleEntry).WithMany(x => x.EntryGroups).HasForeignKey(x => x.ScheduleEntryId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.StudentGroup).WithMany(x => x.EntryGroups).HasForeignKey(x => x.StudentGroupId).OnDelete(DeleteBehavior.Cascade);
        });
        b.Entity<ScheduleComment>(e =>
        {
            e.ToTable("schedule_comments"); e.HasKey(x => x.Id); e.Property(x => x.Body).HasMaxLength(4000); e.Property(x => x.AuthorEmail).HasMaxLength(320); e.Property(x => x.AuthorDisplayName).HasMaxLength(200); e.Property(x => x.AuthorRole).HasMaxLength(64); e.Property(x => x.DeletedBy).HasMaxLength(320); e.HasIndex(x => new { x.ScheduleEntryId, x.CreatedAt });
            e.HasOne(x => x.ScheduleEntry).WithMany(x => x.Comments).HasForeignKey(x => x.ScheduleEntryId).OnDelete(DeleteBehavior.Cascade);
        });
    }
}

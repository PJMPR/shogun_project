using Microsoft.EntityFrameworkCore;
using Shogun.Assignments.Service.Api.Domain.Entities;

namespace Shogun.Assignments.Service.Api.Infrastructure.Persistence;

public class AssignmentsDbContext(DbContextOptions<AssignmentsDbContext> options) : DbContext(options)
{
    public DbSet<LecturerAssignment> LecturerAssignments => Set<LecturerAssignment>();
    public DbSet<AssignmentSubject> AssignmentSubjects => Set<AssignmentSubject>();
    public DbSet<AssignmentAvailability> AssignmentAvailabilities => Set<AssignmentAvailability>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<LecturerAssignment>(e =>
        {
            e.ToTable("lecturer_assignments");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).ValueGeneratedOnAdd();
            e.Property(x => x.LecturerFirstName).HasMaxLength(100).IsRequired();
            e.Property(x => x.LecturerLastName).HasMaxLength(100).IsRequired();
            e.Property(x => x.LecturerEmail).HasMaxLength(200).IsRequired();
            e.Property(x => x.SemesterType).HasMaxLength(20).IsRequired();
            e.Property(x => x.AcademicYear).HasMaxLength(20).IsRequired();
            e.Property(x => x.Notes).HasMaxLength(2000);
            e.Property(x => x.SubmittedAt).IsRequired();

            e.HasMany(x => x.Subjects)
             .WithOne(x => x.Assignment)
             .HasForeignKey(x => x.AssignmentId)
             .OnDelete(DeleteBehavior.Cascade);

            e.HasMany(x => x.Availability)
             .WithOne(x => x.Assignment)
             .HasForeignKey(x => x.AssignmentId)
             .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<AssignmentSubject>(e =>
        {
            e.ToTable("assignment_subjects");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).ValueGeneratedOnAdd();
            e.Property(x => x.SubjectMongoId).HasMaxLength(100);
            e.Property(x => x.SubjectName).HasMaxLength(500).IsRequired();
            e.Property(x => x.SubjectCode).HasMaxLength(50);
            e.Property(x => x.TrybStudiow).HasMaxLength(50).IsRequired();
            e.Property(x => x.Semester).IsRequired();
        });

        modelBuilder.Entity<AssignmentAvailability>(e =>
        {
            e.ToTable("assignment_availability");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).ValueGeneratedOnAdd();
            e.Property(x => x.Day).HasMaxLength(20).IsRequired();
            e.Property(x => x.FromTime).HasMaxLength(10).IsRequired();
            e.Property(x => x.ToTime).HasMaxLength(10).IsRequired();
        });
    }
}

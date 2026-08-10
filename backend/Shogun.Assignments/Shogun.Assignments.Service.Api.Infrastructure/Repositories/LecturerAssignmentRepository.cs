using Microsoft.EntityFrameworkCore;
using Shogun.Assignments.Service.Api.Domain.Entities;
using Shogun.Assignments.Service.Api.Domain.Repositories;
using Shogun.Assignments.Service.Api.Infrastructure.Persistence;

namespace Shogun.Assignments.Service.Api.Infrastructure.Repositories;

public class LecturerAssignmentRepository(AssignmentsDbContext db) : ILecturerAssignmentRepository
{
    public async Task<LecturerAssignment> CreateAsync(LecturerAssignment assignment, CancellationToken ct = default)
    {
        db.LecturerAssignments.Add(assignment);
        await db.SaveChangesAsync(ct);
        return assignment;
    }

    public Task<LecturerAssignment?> GetByIdAsync(int id, CancellationToken ct = default) =>
        db.LecturerAssignments
          .Include(a => a.Subjects)
          .Include(a => a.Availability)
          .FirstOrDefaultAsync(a => a.Id == id, ct);

    public async Task<IReadOnlyList<LecturerAssignment>> GetAllAsync(CancellationToken ct = default) =>
        await db.LecturerAssignments
                .Include(a => a.Subjects)
                .Include(a => a.Availability)
                .OrderByDescending(a => a.SubmittedAt)
                .ToListAsync(ct);

    public async Task<IReadOnlyList<LecturerAssignment>> GetByUserIdAsync(string userId, string? legacyEmail, CancellationToken ct = default)
    {
        if (!string.IsNullOrWhiteSpace(legacyEmail))
        {
            var normalizedEmail = legacyEmail.Trim().ToLowerInvariant();
            await db.LecturerAssignments
                .Where(a => a.LecturerUserId == null && a.LecturerEmail != null && a.LecturerEmail.ToLower() == normalizedEmail)
                .ExecuteUpdateAsync(update => update.SetProperty(a => a.LecturerUserId, userId), ct);
        }

        return await db.LecturerAssignments
                .Include(a => a.Subjects)
                .Include(a => a.Availability)
                .Where(a => a.LecturerUserId == userId)
                .OrderByDescending(a => a.SubmittedAt)
                .ToListAsync(ct);
    }

    public async Task<IReadOnlyList<LecturerAssignment>> GetLatestPerLecturerAsync(CancellationToken ct = default)
    {
        // Keep the most recent submission for each lecturer and semester type.
        // A lecturer may submit separate desiderata for the winter and summer semesters.
        var latestIds = await db.LecturerAssignments
            .GroupBy(a => new { Identity = a.LecturerUserId ?? a.LecturerEmail!, a.SemesterType })
            .Select(g => g.OrderByDescending(a => a.SubmittedAt).First().Id)
            .ToListAsync(ct);

        return await db.LecturerAssignments
            .Include(a => a.Subjects)
            .Include(a => a.Availability)
            .Where(a => latestIds.Contains(a.Id))
            .OrderBy(a => a.LecturerLastName)
            .ThenBy(a => a.LecturerFirstName)
            .ToListAsync(ct);
    }
}

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

    public async Task<IReadOnlyList<LecturerAssignment>> GetByEmailAsync(string email, CancellationToken ct = default) =>
        await db.LecturerAssignments
                .Include(a => a.Subjects)
                .Include(a => a.Availability)
                .Where(a => a.LecturerEmail == email)
                .OrderByDescending(a => a.SubmittedAt)
                .ToListAsync(ct);

    public async Task<IReadOnlyList<LecturerAssignment>> GetLatestPerLecturerAsync(CancellationToken ct = default)
    {
        // For each lecturer email, pick the most recent submission
        var latestIds = await db.LecturerAssignments
            .GroupBy(a => a.LecturerEmail)
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

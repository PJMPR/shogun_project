using Shogun.Users.Domain.Entities;
using Shogun.Users.Domain.Repositories;
using Shogun.Users.Infrastructure.Data;

namespace Shogun.Users.Infrastructure.Repositories;

internal sealed class AuditLogRepository(UsersDbContext db) : IAuditLogRepository
{
    public async Task AddAsync(RoleChangeAuditLog entry, CancellationToken ct = default)
    {
        db.RoleChangeAuditLogs.Add(entry);
        await db.SaveChangesAsync(ct);
    }
}

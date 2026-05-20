namespace Shogun.Users.Domain.Repositories;

public interface IAuditLogRepository
{
    Task AddAsync(Domain.Entities.RoleChangeAuditLog entry, CancellationToken ct = default);
}

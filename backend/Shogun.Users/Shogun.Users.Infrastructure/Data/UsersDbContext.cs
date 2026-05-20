using Microsoft.EntityFrameworkCore;
using Shogun.Users.Domain.Entities;

namespace Shogun.Users.Infrastructure.Data;

public sealed class UsersDbContext(DbContextOptions<UsersDbContext> options) : DbContext(options)
{
    public DbSet<RoleChangeAuditLog> RoleChangeAuditLogs => Set<RoleChangeAuditLog>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<RoleChangeAuditLog>(e =>
        {
            e.ToTable("role_change_audit_log");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).ValueGeneratedOnAdd();
            e.Property(x => x.UserId).HasMaxLength(100).IsRequired();
            e.Property(x => x.ActorId).HasMaxLength(100).IsRequired();
            e.Property(x => x.AddedRoles).HasMaxLength(500);
            e.Property(x => x.RemovedRoles).HasMaxLength(500);
            e.Property(x => x.ChangedAt).IsRequired();
        });
    }
}

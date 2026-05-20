namespace Shogun.Users.Domain.Entities;

public sealed class RoleChangeAuditLog
{
    public int Id { get; set; }
    public string UserId { get; set; } = string.Empty;
    public string ActorId { get; set; } = string.Empty;
    public string AddedRoles { get; set; } = string.Empty;
    public string RemovedRoles { get; set; } = string.Empty;
    public DateTime ChangedAt { get; set; }
}

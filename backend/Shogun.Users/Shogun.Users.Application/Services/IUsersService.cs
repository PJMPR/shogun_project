using Shogun.Users.Application.Dtos;

namespace Shogun.Users.Application.Services;

public interface IUsersService
{
    Task<IReadOnlyList<ManagedRoleDto>> GetManagedRolesAsync(CancellationToken ct = default);
    Task<ManagedRoleDto> GetManagedRoleAsync(string roleName, CancellationToken ct = default);
    Task CreateManagedRoleAsync(
        string roleName,
        string? description,
        IReadOnlyDictionary<string, IReadOnlyList<string>>? attributes,
        CancellationToken ct = default);

    Task UpdateManagedRoleAsync(
        string currentRoleName,
        string newRoleName,
        string? description,
        IReadOnlyDictionary<string, IReadOnlyList<string>>? attributes,
        CancellationToken ct = default);

    Task DeleteManagedRoleAsync(string roleName, CancellationToken ct = default);
    Task<IReadOnlyList<string>> GetUserProjectsAsync(string userId, CancellationToken ct = default);
    Task<IReadOnlyList<UserDto>> GetUsersAsync(CancellationToken ct = default);
    Task<IReadOnlyList<UserDirectoryItemDto>> SearchUserDirectoryAsync(string query, int limit, string currentUserId, CancellationToken ct = default);
    Task<IReadOnlyList<UserDirectoryItemDto>> ResolveUserDirectoryAsync(IReadOnlyList<string> userIds, CancellationToken ct = default);
    Task<IReadOnlyList<string>> GetUserRolesAsync(string userId, CancellationToken ct = default);
    Task SetUserRolesAsync(string userId, IReadOnlyList<string> roles, string actorId, CancellationToken ct = default);
}

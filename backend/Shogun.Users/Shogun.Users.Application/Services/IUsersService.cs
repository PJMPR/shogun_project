using Shogun.Users.Application.Dtos;

namespace Shogun.Users.Application.Services;

public interface IUsersService
{
    Task<IReadOnlyList<string>> GetManagedRolesAsync(CancellationToken ct = default);
    Task<IReadOnlyList<UserDto>> GetUsersAsync(CancellationToken ct = default);
    Task<IReadOnlyList<string>> GetUserRolesAsync(string userId, CancellationToken ct = default);
    Task SetUserRolesAsync(string userId, IReadOnlyList<string> roles, string actorId, CancellationToken ct = default);
}

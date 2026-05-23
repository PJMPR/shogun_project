namespace Shogun.Users.Application.Dtos;

public sealed record UserDto(
    string Id,
    string Username,
    string? FirstName,
    string? LastName,
    string? Email,
    bool Enabled,
    IReadOnlyList<string> Roles);

public sealed record SetRolesRequest(IReadOnlyList<string> Roles);

public sealed record CreateRoleRequest(
    string Name,
    string? Description,
    IReadOnlyDictionary<string, IReadOnlyList<string>>? Attributes);

public sealed record UpdateRoleRequest(
    string Name,
    string? Description,
    IReadOnlyDictionary<string, IReadOnlyList<string>>? Attributes);

public sealed record ManagedRoleDto(
    string Name,
    string? Description,
    IReadOnlyDictionary<string, IReadOnlyList<string>> Attributes);

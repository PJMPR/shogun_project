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

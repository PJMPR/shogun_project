namespace Shogun.Users.Infrastructure.Keycloak;

public sealed class KeycloakAdminOptions
{
    public string AdminBaseUrl { get; set; } = string.Empty;
    public string Realm { get; set; } = "shogun";
    public string ClientId { get; set; } = string.Empty;
    public string ClientSecret { get; set; } = string.Empty;
}

using System.ComponentModel.DataAnnotations;

namespace Shogun.Email.Api;

public sealed class SmtpOptions
{
    public const string SectionName = "Smtp";

    [Required] public string Host { get; init; } = "smtp.gmail.com";
    [Range(1, 65535)] public int Port { get; init; } = 587;
    [Required] public string Username { get; init; } = string.Empty;
    [Required] public string Password { get; init; } = string.Empty;
    [Required, EmailAddress] public string FromEmail { get; init; } = "shogun@pjwstk.edu.pl";
    [Required] public string FromName { get; init; } = "Shogun";
    [Range(1, 5)] public int MaxAttempts { get; init; } = 3;
}

public sealed class ApiSecurityOptions
{
    public const string SectionName = "InternalApiKey";
    public string ApiKey { get; init; } = string.Empty;
}

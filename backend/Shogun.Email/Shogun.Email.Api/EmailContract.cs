using System.ComponentModel.DataAnnotations;

namespace Shogun.Email.Api;

public sealed record SendEmailRequest(
    [property: Required, StringLength(200)] string Subject,
    [property: Required, StringLength(200)] string Heading,
    [property: Required, StringLength(10_000, MinimumLength = 1)] string Message,
    IReadOnlyList<string>? Comments,
    [property: Url, StringLength(2_048)] string? Link,
    [property: StringLength(100)] string? LinkText,
    [property: Required, MinLength(1), MaxLength(100)] IReadOnlyList<EmailRecipient> Recipients);

public sealed record EmailRecipient(
    [property: Required, StringLength(200)] string Name,
    [property: Required, EmailAddress, StringLength(320)] string Email);

public sealed record SendEmailResponse(int Sent, int Failed);

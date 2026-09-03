using System.ComponentModel.DataAnnotations;

namespace Shogun.Email.Api;

public static class EmailEndpoints
{
    public static async Task<IResult> SendAsync(
        SendEmailRequest request,
        IEmailSender sender,
        IEmailTemplateRenderer renderer,
        ILoggerFactory loggerFactory,
        CancellationToken cancellationToken)
    {
        var errors = Validate(request);
        if (errors.Count > 0)
            return Results.ValidationProblem(errors);

        var logger = loggerFactory.CreateLogger("EmailDelivery");
        var sent = 0;
        var failed = 0;

        foreach (var recipient in request.Recipients)
        {
            try
            {
                var content = renderer.Render(request, recipient.Name);
                await sender.SendAsync(recipient, request.Subject, content, cancellationToken);
                sent++;
            }
            catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
            {
                throw;
            }
            catch (Exception exception)
            {
                failed++;
                logger.LogError("Wysyłka wiadomości nie powiodła się po wszystkich próbach. Typ błędu: {ErrorType}", exception.GetType().Name);
            }
        }

        logger.LogInformation("Zakończono wysyłkę wiadomości. Wysłano: {Sent}, błędy: {Failed}", sent, failed);
        var response = new SendEmailResponse(sent, failed);
        return failed == 0 ? Results.Ok(response) : Results.Json(response, statusCode: StatusCodes.Status502BadGateway);
    }

    private static Dictionary<string, string[]> Validate(SendEmailRequest request)
    {
        var errors = new Dictionary<string, List<string>>(StringComparer.OrdinalIgnoreCase);
        ValidateObject(request, string.Empty, errors);

        if (request.Comments is { Count: > 20 }) Add(errors, "comments", "Maksymalna liczba komentarzy wynosi 20.");
        if (request.Comments is not null)
        {
            for (var index = 0; index < request.Comments.Count; index++)
            {
                if (request.Comments[index] is null)
                    Add(errors, $"comments[{index}]", "Komentarz nie może być pusty.");
                else if (request.Comments[index].Length > 2_000)
                    Add(errors, $"comments[{index}]", "Komentarz może mieć maksymalnie 2000 znaków.");
            }
        }

        if (request.Link is not null && (!Uri.TryCreate(request.Link, UriKind.Absolute, out var uri) || uri.Scheme is not ("http" or "https")))
            Add(errors, "link", "Link musi być bezwzględnym adresem HTTP lub HTTPS.");
        if (request.Link is not null && string.IsNullOrWhiteSpace(request.LinkText))
            Add(errors, "linkText", "Tekst przycisku jest wymagany, gdy podano link.");
        if (request.Link is null && request.LinkText is not null)
            Add(errors, "linkText", "Tekst przycisku można podać tylko razem z linkiem.");

        if (request.Recipients is not null)
        {
            for (var index = 0; index < request.Recipients.Count; index++)
            {
                if (request.Recipients[index] is null)
                    Add(errors, $"recipients[{index}]", "Odbiorca nie może być pusty.");
                else
                    ValidateObject(request.Recipients[index], $"recipients[{index}]", errors);
            }
        }

        return errors.ToDictionary(pair => pair.Key, pair => pair.Value.ToArray(), StringComparer.OrdinalIgnoreCase);
    }

    private static void ValidateObject(object value, string prefix, Dictionary<string, List<string>> errors)
    {
        var results = new List<ValidationResult>();
        Validator.TryValidateObject(value, new ValidationContext(value), results, true);
        foreach (var result in results)
        foreach (var member in result.MemberNames.DefaultIfEmpty(string.Empty))
            Add(errors, string.IsNullOrEmpty(prefix) ? ToCamelCase(member) : $"{prefix}.{ToCamelCase(member)}", result.ErrorMessage ?? "Nieprawidłowa wartość.");
    }

    private static string ToCamelCase(string value) => string.IsNullOrEmpty(value) ? value : char.ToLowerInvariant(value[0]) + value[1..];
    private static void Add(Dictionary<string, List<string>> errors, string key, string error)
    {
        if (!errors.TryGetValue(key, out var values)) errors[key] = values = [];
        values.Add(error);
    }
}

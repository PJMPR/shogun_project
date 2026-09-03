using System.Net.Http.Json;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Shogun.Schedule.Application;

namespace Shogun.Schedule.Infrastructure;

public sealed class EmailMentionNotifier(
    HttpClient http,
    IConfiguration configuration,
    ILogger<EmailMentionNotifier> logger) : IMentionNotifier
{
    public async Task NotifyAsync(MentionNotification notification, CancellationToken ct)
    {
        if (notification.Recipients.Count == 0) return;

        try
        {
            using var request = new HttpRequestMessage(HttpMethod.Post, "/api/emails");
            request.Headers.Add("X-Internal-Api-Key", configuration["EmailApi:ApiKey"]);
            request.Content = JsonContent.Create(new
            {
                subject = notification.Kind == "comment"
                    ? "Oznaczono Cię w komentarzu do planu zajęć"
                    : "Oznaczono Cię w notatce do planu zajęć",
                heading = notification.Heading,
                message = $"{notification.AuthorDisplayName} oznaczył(a) Cię w {(notification.Kind == "comment" ? "komentarzu" : "notatce")} dotyczącym planu „{notification.ScheduleName}”.",
                comments = new[] { notification.Body },
                link = BuildScheduleUrl(),
                linkText = "Otwórz plan zajęć",
                recipients = notification.Recipients.Select(x => new { name = x.DisplayName, email = x.Email }).ToArray(),
            });

            using var response = await http.SendAsync(request, ct);
            if (!response.IsSuccessStatusCode)
                logger.LogError("Email API odrzuciło powiadomienie o oznaczeniu. Status HTTP: {StatusCode}, liczba odbiorców: {RecipientCount}", (int)response.StatusCode, notification.Recipients.Count);
        }
        catch (OperationCanceledException) when (ct.IsCancellationRequested)
        {
            logger.LogWarning("Wysyłka powiadomienia o oznaczeniu została anulowana po zapisaniu danych.");
        }
        catch (Exception exception)
        {
            logger.LogError("Nie udało się przekazać powiadomienia o oznaczeniu do Email API. Typ błędu: {ErrorType}, liczba odbiorców: {RecipientCount}", exception.GetType().Name, notification.Recipients.Count);
        }
    }

    private string BuildScheduleUrl()
    {
        var baseUrl = configuration["EmailApi:PublicAppBaseUrl"]?.TrimEnd('/')
            ?? "https://shogun.pjwstk.edu.pl";
        return $"{baseUrl}/schedule";
    }
}

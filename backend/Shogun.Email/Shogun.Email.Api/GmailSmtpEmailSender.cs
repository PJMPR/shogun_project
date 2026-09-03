using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Options;
using MimeKit;

namespace Shogun.Email.Api;

public interface IEmailSender
{
    Task SendAsync(EmailRecipient recipient, string subject, EmailContent content, CancellationToken cancellationToken);
}

public sealed class GmailSmtpEmailSender(IOptions<SmtpOptions> options, ILogger<GmailSmtpEmailSender> logger) : IEmailSender
{
    public async Task SendAsync(EmailRecipient recipient, string subject, EmailContent content, CancellationToken cancellationToken)
    {
        var settings = options.Value;
        for (var attempt = 1; attempt <= settings.MaxAttempts; attempt++)
        {
            try
            {
                var message = new MimeMessage();
                message.From.Add(new MailboxAddress(settings.FromName, settings.FromEmail));
                message.To.Add(new MailboxAddress(recipient.Name, recipient.Email));
                message.Subject = subject;
                message.Body = new BodyBuilder { HtmlBody = content.Html, TextBody = content.Text }.ToMessageBody();

                using var client = new SmtpClient();
                await client.ConnectAsync(settings.Host, settings.Port, SecureSocketOptions.StartTls, cancellationToken);
                await client.AuthenticateAsync(settings.Username, settings.Password, cancellationToken);
                await client.SendAsync(message, cancellationToken);
                await client.DisconnectAsync(true, cancellationToken);
                return;
            }
            catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
            {
                throw;
            }
            catch (Exception exception) when (attempt < settings.MaxAttempts)
            {
                logger.LogWarning("Próba wysyłki {Attempt}/{MaxAttempts} nie powiodła się. Typ błędu: {ErrorType}", attempt, settings.MaxAttempts, exception.GetType().Name);
                await Task.Delay(TimeSpan.FromSeconds(Math.Pow(2, attempt - 1)), cancellationToken);
            }
        }

        throw new InvalidOperationException("Wysyłka SMTP nie powiodła się po wszystkich próbach.");
    }
}

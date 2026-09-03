using System.Net;
using System.Text;

namespace Shogun.Email.Api;

public sealed record EmailContent(string Html, string Text);

public interface IEmailTemplateRenderer
{
    EmailContent Render(SendEmailRequest request, string recipientName);
}

public sealed class EmailTemplateRenderer : IEmailTemplateRenderer
{
    public EmailContent Render(SendEmailRequest request, string recipientName)
    {
        static string Encode(string value) => WebUtility.HtmlEncode(value);
        static string HtmlLines(string value) => Encode(value).Replace("\r\n", "<br>").Replace("\n", "<br>");

        var comments = request.Comments is { Count: > 0 }
            ? $"<div style=\"margin-top:24px;padding:18px 20px;background:#f6f8fb;border-left:4px solid #d71920;border-radius:6px\"><strong style=\"color:#252a34\">Komentarze</strong><ul style=\"margin:12px 0 0;padding-left:20px\">{string.Join("", request.Comments.Select(comment => $"<li style=\"margin:7px 0\">{HtmlLines(comment)}</li>"))}</ul></div>"
            : string.Empty;
        var button = request.Link is not null
            ? $"<div style=\"margin:30px 0\"><a href=\"{Encode(request.Link)}\" style=\"display:inline-block;padding:13px 22px;background:#d71920;color:#fff;text-decoration:none;border-radius:6px;font-weight:700\">{Encode(request.LinkText!)}</a></div>"
            : string.Empty;

        var html = $$"""
            <!doctype html><html lang="pl"><body style="margin:0;background:#eef1f5;font-family:Arial,sans-serif;color:#30343b">
            <div style="display:none;max-height:0;overflow:hidden">{{Encode(request.Subject)}}</div>
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#eef1f5;padding:28px 12px"><tr><td align="center">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 3px 14px rgba(0,0,0,.08)">
            <tr><td style="height:7px;background:#d71920"></td></tr><tr><td style="padding:34px 38px">
            <div style="font-size:13px;font-weight:700;letter-spacing:1.4px;color:#d71920;text-transform:uppercase">SHOGUN</div>
            <h1 style="margin:12px 0 24px;font-size:25px;line-height:1.3;color:#20242b">{{Encode(request.Heading)}}</h1>
            <p style="margin:0 0 18px;line-height:1.65">Dzień dobry {{Encode(recipientName)}},</p>
            <p style="margin:0;line-height:1.65">{{HtmlLines(request.Message)}}</p>{{comments}}{{button}}
            <p style="margin:32px 0 0;padding-top:20px;border-top:1px solid #e4e7eb;font-size:12px;line-height:1.55;color:#727780">Wiadomość została wygenerowana automatycznie przez system planowania zajęć. Prosimy na nią nie odpowiadać.</p>
            </td></tr></table></td></tr></table></body></html>
            """;

        var text = new StringBuilder().AppendLine(request.Heading).AppendLine().Append("Dzień dobry ").Append(recipientName).AppendLine(",").AppendLine().AppendLine(request.Message);
        if (request.Comments is { Count: > 0 })
        {
            text.AppendLine().AppendLine("Komentarze:");
            foreach (var comment in request.Comments) text.Append("- ").AppendLine(comment);
        }
        if (request.Link is not null) text.AppendLine().Append(request.LinkText).Append(": ").AppendLine(request.Link);
        text.AppendLine().AppendLine("Wiadomość została wygenerowana automatycznie przez system planowania zajęć. Prosimy na nią nie odpowiadać.");
        return new EmailContent(html, text.ToString());
    }
}

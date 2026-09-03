using Shogun.Email.Api;
using Xunit;

namespace Shogun.Email.Api.Tests;

public sealed class EmailTemplateRendererTests
{
    [Fact]
    public void Render_EncodesUserControlledHtml()
    {
        var request = new SendEmailRequest(
            "Temat", "Nagłówek", "Treść <script>alert(1)</script>",
            ["Komentarz <b>test</b>"], "https://example.com/?a=1&b=2", "Otwórz <plan>",
            [new EmailRecipient("Jan", "jan@example.com")]);

        var result = new EmailTemplateRenderer().Render(request, "Jan <Admin>");

        Assert.DoesNotContain("<script>", result.Html);
        Assert.DoesNotContain("<b>test</b>", result.Html);
        Assert.Contains("Jan &lt;Admin&gt;", result.Html);
        Assert.DoesNotContain("<plan>", result.Html);
        Assert.Contains("&lt;plan&gt;", result.Html);
        Assert.Contains("a=1&amp;b=2", result.Html);
    }

    [Fact]
    public void Render_CreatesTextAlternative()
    {
        var request = new SendEmailRequest(
            "Temat", "Aktualizacja", "Nowa treść", ["Zmiana sali"],
            "https://example.com", "Otwórz plan",
            [new EmailRecipient("Jan", "jan@example.com")]);

        var result = new EmailTemplateRenderer().Render(request, "Jan");

        Assert.Contains("Dzień dobry Jan", result.Text);
        Assert.Contains("- Zmiana sali", result.Text);
        Assert.Contains("Otwórz plan: https://example.com", result.Text);
    }
}

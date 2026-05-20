using Microsoft.Extensions.DependencyInjection;
using Shogun.Users.Application.Services;

namespace Shogun.Users.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        services.AddScoped<IUsersService, UsersService>();
        return services;
    }
}

using Microsoft.Extensions.DependencyInjection;
using Shogun.Assignments.Service.Api.Application.Services;

namespace Shogun.Assignments.Service.Api.Application;

public static class ApplicationServiceCollectionExtensions
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        services.AddScoped<IAssignmentService, AssignmentService>();
        return services;
    }
}

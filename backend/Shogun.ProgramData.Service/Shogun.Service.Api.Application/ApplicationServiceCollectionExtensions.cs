using FluentValidation;
using Microsoft.Extensions.DependencyInjection;
using Shogun.Service.Api.Application.DTOs;
using Shogun.Service.Api.Application.Services;
using Shogun.Service.Api.Application.Validators;

namespace Shogun.Service.Api.Application;

public static class ApplicationServiceCollectionExtensions
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        services.AddScoped<SyllabiService>();
        services.AddScoped<ProgramsService>();
        services.AddScoped<ElectivesService>();

        services.AddScoped<IValidator<CreateSyllabusRequest>, CreateSyllabusRequestValidator>();
        services.AddScoped<IValidator<UpdateSyllabusRequest>, UpdateSyllabusRequestValidator>();
        services.AddScoped<IValidator<CreateProgramRequest>, CreateProgramRequestValidator>();
        services.AddScoped<IValidator<UpdateProgramRequest>, UpdateProgramRequestValidator>();
        services.AddScoped<IValidator<CreateElectiveRequest>, CreateElectiveRequestValidator>();
        services.AddScoped<IValidator<UpdateElectiveRequest>, UpdateElectiveRequestValidator>();

        return services;
    }
}

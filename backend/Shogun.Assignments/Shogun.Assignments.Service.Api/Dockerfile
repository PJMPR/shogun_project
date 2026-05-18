FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS base
WORKDIR /app
EXPOSE 8080

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY ["Shogun.Assignments.Service.Api/Shogun.Assignments.Service.Api.csproj", "Shogun.Assignments.Service.Api/"]
COPY ["Shogun.Assignments.Service.Api.Application/Shogun.Assignments.Service.Api.Application.csproj", "Shogun.Assignments.Service.Api.Application/"]
COPY ["Shogun.Assignments.Service.Api.Domain/Shogun.Assignments.Service.Api.Domain.csproj", "Shogun.Assignments.Service.Api.Domain/"]
COPY ["Shogun.Assignments.Service.Api.Infrastructure/Shogun.Assignments.Service.Api.Infrastructure.csproj", "Shogun.Assignments.Service.Api.Infrastructure/"]
RUN dotnet restore "Shogun.Assignments.Service.Api/Shogun.Assignments.Service.Api.csproj"
COPY . .
WORKDIR "/src/Shogun.Assignments.Service.Api"
RUN dotnet build "Shogun.Assignments.Service.Api.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "Shogun.Assignments.Service.Api.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "Shogun.Assignments.Service.Api.dll"]

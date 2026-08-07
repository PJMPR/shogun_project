FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS base
WORKDIR /app
EXPOSE 8080
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY ["Shogun.Schedule.Api/Shogun.Schedule.Api.csproj", "Shogun.Schedule.Api/"]
COPY ["Shogun.Schedule.Application/Shogun.Schedule.Application.csproj", "Shogun.Schedule.Application/"]
COPY ["Shogun.Schedule.Domain/Shogun.Schedule.Domain.csproj", "Shogun.Schedule.Domain/"]
COPY ["Shogun.Schedule.Infrastructure/Shogun.Schedule.Infrastructure.csproj", "Shogun.Schedule.Infrastructure/"]
RUN dotnet restore "Shogun.Schedule.Api/Shogun.Schedule.Api.csproj"
COPY . .
RUN dotnet publish "Shogun.Schedule.Api/Shogun.Schedule.Api.csproj" -c Release -o /app/publish /p:UseAppHost=false
FROM base AS final
WORKDIR /app
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "Shogun.Schedule.Api.dll"]

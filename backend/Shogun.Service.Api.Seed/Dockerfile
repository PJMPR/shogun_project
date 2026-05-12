FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS base
WORKDIR /app

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY ["Shogun.Service.Api.Seed/Shogun.Service.Api.Seed.csproj", "Shogun.Service.Api.Seed/"]
COPY ["Shogun.Service.Api.Domain/Shogun.Service.Api.Domain.csproj", "Shogun.Service.Api.Domain/"]
COPY ["Shogun.Service.Api.Infrastructure/Shogun.Service.Api.Infrastructure.csproj", "Shogun.Service.Api.Infrastructure/"]
COPY ["Shogun.Service.Api.Application/Shogun.Service.Api.Application.csproj", "Shogun.Service.Api.Application/"]
RUN dotnet restore "Shogun.Service.Api.Seed/Shogun.Service.Api.Seed.csproj"
COPY . .
WORKDIR "/src/Shogun.Service.Api.Seed"
RUN dotnet publish "Shogun.Service.Api.Seed.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "Shogun.Service.Api.Seed.dll"]

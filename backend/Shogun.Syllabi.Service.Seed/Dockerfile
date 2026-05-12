FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS base
WORKDIR /app

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY ["Shogun.Syllabi.Service.Seed/Shogun.Syllabi.Service.Seed.csproj", "Shogun.Syllabi.Service.Seed/"]
COPY ["Shogun.Syllabi.Service.Domain/Shogun.Syllabi.Service.Domain.csproj", "Shogun.Syllabi.Service.Domain/"]
COPY ["Shogun.Syllabi.Service.Infrastructure/Shogun.Syllabi.Service.Infrastructure.csproj", "Shogun.Syllabi.Service.Infrastructure/"]
COPY ["Shogun.Syllabi.Service.Application/Shogun.Syllabi.Service.Application.csproj", "Shogun.Syllabi.Service.Application/"]
RUN dotnet restore "Shogun.Syllabi.Service.Seed/Shogun.Syllabi.Service.Seed.csproj"
COPY . .
WORKDIR "/src/Shogun.Syllabi.Service.Seed"
RUN dotnet publish "Shogun.Syllabi.Service.Seed.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "Shogun.Syllabi.Service.Seed.dll"]

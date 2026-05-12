FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS base
WORKDIR /app
EXPOSE 8080

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY ["Shogun.Syllabi.Service.Api/Shogun.Syllabi.Service.Api.csproj", "Shogun.Syllabi.Service.Api/"]
COPY ["Shogun.Syllabi.Service.Application/Shogun.Syllabi.Service.Application.csproj", "Shogun.Syllabi.Service.Application/"]
COPY ["Shogun.Syllabi.Service.Domain/Shogun.Syllabi.Service.Domain.csproj", "Shogun.Syllabi.Service.Domain/"]
COPY ["Shogun.Syllabi.Service.Infrastructure/Shogun.Syllabi.Service.Infrastructure.csproj", "Shogun.Syllabi.Service.Infrastructure/"]
RUN dotnet restore "Shogun.Syllabi.Service.Api/Shogun.Syllabi.Service.Api.csproj"
COPY . .
WORKDIR "/src/Shogun.Syllabi.Service.Api"
RUN dotnet build "Shogun.Syllabi.Service.Api.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "Shogun.Syllabi.Service.Api.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "Shogun.Syllabi.Service.Api.dll"]

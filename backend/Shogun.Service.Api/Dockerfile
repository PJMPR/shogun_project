FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS base
WORKDIR /app
EXPOSE 8080

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY ["Shogun.Service.Api/Shogun.Service.Api.csproj", "Shogun.Service.Api/"]
COPY ["Shogun.Service.Api.Application/Shogun.Service.Api.Application.csproj", "Shogun.Service.Api.Application/"]
COPY ["Shogun.Service.Api.Domain/Shogun.Service.Api.Domain.csproj", "Shogun.Service.Api.Domain/"]
COPY ["Shogun.Service.Api.Infrastructure/Shogun.Service.Api.Infrastructure.csproj", "Shogun.Service.Api.Infrastructure/"]
RUN dotnet restore "Shogun.Service.Api/Shogun.Service.Api.csproj"
COPY . .
WORKDIR "/src/Shogun.Service.Api"
RUN dotnet build "Shogun.Service.Api.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "Shogun.Service.Api.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "Shogun.Service.Api.dll"]

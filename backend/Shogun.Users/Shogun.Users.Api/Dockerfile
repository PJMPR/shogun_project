FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS base
WORKDIR /app
EXPOSE 8080

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY ["Shogun.Users.Api/Shogun.Users.Api.csproj", "Shogun.Users.Api/"]
COPY ["Shogun.Users.Application/Shogun.Users.Application.csproj", "Shogun.Users.Application/"]
COPY ["Shogun.Users.Domain/Shogun.Users.Domain.csproj", "Shogun.Users.Domain/"]
COPY ["Shogun.Users.Infrastructure/Shogun.Users.Infrastructure.csproj", "Shogun.Users.Infrastructure/"]
RUN dotnet restore "Shogun.Users.Api/Shogun.Users.Api.csproj"
COPY . .
WORKDIR "/src/Shogun.Users.Api"
RUN dotnet build "Shogun.Users.Api.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "Shogun.Users.Api.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "Shogun.Users.Api.dll"]

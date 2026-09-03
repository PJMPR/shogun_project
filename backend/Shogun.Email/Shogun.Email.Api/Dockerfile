FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS base
WORKDIR /app
EXPOSE 8080

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY ["Shogun.Email.Api/Shogun.Email.Api.csproj", "Shogun.Email.Api/"]
RUN dotnet restore "Shogun.Email.Api/Shogun.Email.Api.csproj"
COPY . .
RUN dotnet publish "Shogun.Email.Api/Shogun.Email.Api.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app
COPY --from=build /app/publish .
USER $APP_UID
ENTRYPOINT ["dotnet", "Shogun.Email.Api.dll"]

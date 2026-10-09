FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS base
WORKDIR /app
EXPOSE 8080
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY ["Shogun.Export/Shogun.Export.Api/Shogun.Export.Api.csproj", "Shogun.Export/Shogun.Export.Api/"]
COPY ["Shogun.Schedule/Shogun.Schedule.Application/Shogun.Schedule.Application.csproj", "Shogun.Schedule/Shogun.Schedule.Application/"]
COPY ["Shogun.Schedule/Shogun.Schedule.Domain/Shogun.Schedule.Domain.csproj", "Shogun.Schedule/Shogun.Schedule.Domain/"]
RUN dotnet restore "Shogun.Export/Shogun.Export.Api/Shogun.Export.Api.csproj"
COPY . .
RUN dotnet publish "Shogun.Export/Shogun.Export.Api/Shogun.Export.Api.csproj" -c Release -o /app/publish /p:UseAppHost=false
FROM base AS final
WORKDIR /app
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "Shogun.Export.Api.dll"]

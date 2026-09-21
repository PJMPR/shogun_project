FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY ["Shogun.SyllabusPdf.Api/Shogun.SyllabusPdf.Api.csproj", "Shogun.SyllabusPdf.Api/"]
RUN dotnet restore "Shogun.SyllabusPdf.Api/Shogun.SyllabusPdf.Api.csproj"
COPY . .
RUN dotnet publish "Shogun.SyllabusPdf.Api/Shogun.SyllabusPdf.Api.csproj" \
    -c Release \
    -o /app/publish \
    /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates curl wget \
    && . /etc/os-release \
    && wget -q "https://packages.microsoft.com/config/${ID}/${VERSION_ID}/packages-microsoft-prod.deb" -O /tmp/packages-microsoft-prod.deb \
    && dpkg -i /tmp/packages-microsoft-prod.deb \
    && rm /tmp/packages-microsoft-prod.deb \
    && apt-get update \
    && apt-get install -y --no-install-recommends \
        powershell \
        texlive-latex-base \
        texlive-latex-recommended \
        texlive-latex-extra \
        texlive-fonts-recommended \
        texlive-lang-polish \
        lmodern \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

COPY --from=build /app/publish .

ENV ASPNETCORE_URLS=http://+:8080 \
    DOTNET_CLI_HOME=/tmp \
    HOME=/tmp \
    POWERSHELL_TELEMETRY_OPTOUT=1

EXPOSE 8080
USER $APP_UID

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD curl --fail --silent http://localhost:8080/health/ready || exit 1

ENTRYPOINT ["dotnet", "Shogun.SyllabusPdf.Api.dll"]

# Build stage
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY patches/ patches/
RUN npm ci
COPY . .
RUN npm run build:prod

# Serve stage
FROM nginx:alpine AS final
COPY --from=build /app/dist/pj-studies-schedule/browser /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80

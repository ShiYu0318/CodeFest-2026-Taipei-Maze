# syntax=docker/dockerfile:1
FROM node:20-alpine AS base
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.15.9 --activate
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# ---- dev: Vite dev server with hot reload (port 5173) ----
FROM base AS dev
COPY . .
EXPOSE 5173
CMD ["pnpm", "dev", "--host", "0.0.0.0"]

# ---- build: produce static files in dist/ ----
FROM base AS build
COPY . .
RUN pnpm build-only

# ---- prod: nginx serving dist/ with SPA fallback ----
FROM nginx:alpine AS prod
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80

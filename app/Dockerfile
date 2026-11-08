# syntax=docker/dockerfile:1
FROM node:20-alpine AS base
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---- dev: Vue CLI dev server with hot reload (port 5173) ----
FROM base AS dev
COPY . .
EXPOSE 5173
CMD ["npm", "run", "serve", "--", "--host", "0.0.0.0", "--port", "5173"]

# ---- build: produce static files in dist/ ----
FROM base AS build
ARG VUE_APP_COMMIT
ARG VUE_APP_BUILD_DATE
ENV VUE_APP_COMMIT=$VUE_APP_COMMIT
ENV VUE_APP_BUILD_DATE=$VUE_APP_BUILD_DATE
COPY . .
RUN npm run build

# ---- prod: nginx serving dist/ with SPA fallback ----
FROM nginx:alpine AS prod
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80

# Stage 1: Build the Angular app
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build --configuration=production

# Stage 2: Serve with nginx
FROM nginx:alpine

COPY --from=builder /app/dist/dupe-finder-ui/browser /usr/share/nginx/html
EXPOSE 80

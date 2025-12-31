# Dupe Finder 🔍

A small utility to find and remove duplicate image files. Select a directory containing images, inspect matching duplicates in an intuitive UI, and delete unwanted copies. The frontend is an Angular app and the backend is a Spring Boot service that scans directories, generates thumbnails, and exposes REST and WebSocket endpoints.

---

## 🚀 Features

- Detects duplicate files by content (SHA-512 hash).
- Displays duplicate groups and thumbnails to help you choose which files to delete.
- Generates thumbnails and serves them via a lightweight nginx static server.
- Delete selected files via backend REST endpoint.
- WebSocket notifications for thumbnail availability (/topic/thumbnails).

---

## 🧭 Architecture

- Frontend: `dupe-finder-ui` (Angular). Builds a static site served by nginx in the container.
- Static server: `nginx:alpine` serving thumbnails and cached images from `${HOME}/dup_files/static_content`.
- Backend: `server` (Spring Boot) - provides REST APIs and WebSocket endpoint `/ws`.

Key files:
- `docker-compose.yml` (project root) — runs frontend and static nginx (and optionally backend if you add it).
- `dupe-finder-ui/Dockerfile` — builds Angular app and serves it with nginx.
- `server/Dockerfile` — builds the Spring Boot JAR and runs it.

---

## ▶️ Quick start (Docker)

Requirements:
- Docker (and Docker Compose v2+)

To run the frontend and static server (what is included in `docker-compose.yml`):

```bash
# from project root
docker compose up --build
```

- Frontend UI: http://localhost:4200
- Static assets (images/thumbnails): http://localhost:8085

Notes:
- The compose file mounts the host directory `${HOME}/dup_files/static_content` into the static nginx container. On Windows you may prefer `${USERPROFILE}/dup_files/static_content`.
- By default the frontend points to the backend at `http://host.docker.internal:8080` for REST and `ws://host.docker.internal:8080` for WebSocket. If you run the backend in the same compose file, you can use a service name (e.g., `http://backend:8080`).

---

## 🛠️ Running locally (without Docker)

Frontend (dev server):

```bash
cd dupe-finder-ui
npm install
npm run start
# open http://localhost:4200
```

Backend (development):

```bash
cd server
./mvnw spring-boot:run
# or build then run
./mvnw clean package -DskipTests
java -jar target/*.jar
```

---

## 🔌 Backend API (summary)

- POST `/findDuplicates` — body: JSON `DuplicateFileFinderFilter` with `rootDirectories` (list). Returns duplicate groups.
- POST `/dupeMetadata` — multipart file upload to process metadata file and return groups.
- POST `/deleteFiles` — body: `DeleteFileRequest` { paths: ["/abs/path/1", ...] } — deletes specified files.
- DELETE `/clearCache` — clear cached thumbnails.
- POST `/cacheFile` — body: `CacheFileRequest` { path: "/abs/path/to/file" } — copies file to static content directory and returns cached filename.

WebSocket:
- Endpoint: `ws://<backend-host>:8080/ws` (STOMP over SockJS)
- Topic: `/topic/thumbnails` — notifications with generated thumbnail info.

---

## 📁 Static content & thumbnails

The app writes thumbnails to: `${HOME}/dup_files/static_content` (on Windows the code writes `\static_content\` under the user's home directory). The static nginx container mounts that directory as read-only so thumbnails can be served directly.

If thumbnails are not visible, check that the host mount exists and is accessible to Docker.

---

## 📜 License

This project includes a `LICENSE` file — refer to it for licensing details.
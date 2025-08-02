# --- Build stage ---
FROM eclipse-temurin:21-jdk-alpine as builder

WORKDIR /app

COPY . .

# Use Maven Wrapper to build the app (skip tests for faster builds)
RUN ./mvnw clean package -DskipTests

# --- Runtime stage ---
FROM eclipse-temurin:21-jdk-alpine

WORKDIR /app

COPY --from=builder /app/target/*.jar app.jar

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]

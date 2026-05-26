# Stage 1: Build
FROM maven:3.9.6-eclipse-temurin-17-alpine AS build
WORKDIR /app

# Copy the parent pom and all poms
COPY pom.xml .
COPY shared-library/pom.xml shared-library/pom.xml
COPY auth-service/pom.xml auth-service/pom.xml
COPY snapshot-service/pom.xml snapshot-service/pom.xml
COPY diff-service/pom.xml diff-service/pom.xml
COPY risk-service/pom.xml risk-service/pom.xml
COPY git-service/pom.xml git-service/pom.xml
COPY analytics-service/pom.xml analytics-service/pom.xml
COPY notification-service/pom.xml notification-service/pom.xml
COPY api-gateway/pom.xml api-gateway/pom.xml

RUN mvn dependency:go-offline -B

# Copy source code
COPY shared-library shared-library
COPY diff-service diff-service

# Build diff-service and dependencies
RUN mvn package -DskipTests -pl diff-service -am

# Stage 2: Runtime
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY --from=build /app/diff-service/target/*.jar app.jar
EXPOSE 8083
ENTRYPOINT ["java", "-jar", "app.jar"]

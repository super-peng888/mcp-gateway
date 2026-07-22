# Backend image. Build the executable jar on the host first:
#   mvn clean package -DskipTests
# The jar is built on the host because this environment cannot reach Maven
# Central from inside containers; the host's local Maven repository cache is
# used instead. If your CI has Maven Central access, you can replace this with
# a multi-stage build (maven:3.9-eclipse-temurin-17 -> eclipse-temurin:17-jre).
FROM eclipse-temurin:17-jre-alpine

WORKDIR /app
COPY target/mcp-gateway-server-*.jar app.jar

EXPOSE 8082
ENTRYPOINT ["java", "-jar", "app.jar"]

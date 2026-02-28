---
description: Safely bootstrap and tear down the local streaming lakehouse infrastructure.
---
This workflow manages the Docker Compose stack for the streaming lakehouse (Kafka, Flink, Iceberg REST, MinIO, Trino, Postgres).

To start the infrastructure:
1. Ensure Docker is running with at least 12GB of memory allocated.
// turbo
2. Run the command to start the stack:
   `docker-compose up -d`
3. Wait for 2-3 minutes to allow Trino and Flink TaskManagers to become healthy before proceeding with other tasks.

To stop the infrastructure cleanly:
// turbo
1. Run the command:
   `docker-compose down`

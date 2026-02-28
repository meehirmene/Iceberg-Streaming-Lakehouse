---
description: Check the end-to-end status of the streaming pipeline.
---
This workflow verifies that data is flowing continuously from Kafka through Flink to Iceberg and Trino.

// turbo-all
1. Check Kafka topic existence and statuses:
   `docker exec kafka /opt/bitnami/kafka/bin/kafka-topics.sh --list --bootstrap-server localhost:9092`
2. Check running Flink jobs:
   `docker exec jobmanager /opt/flink/bin/flink list -r`
3. Verify data in Iceberg via Trino:
   `docker exec trino trino --execute "SELECT COUNT(*) FROM iceberg.ride_hailing.iceberg_surge_pricing;"`
   `docker exec trino trino --execute "SELECT COUNT(*) FROM iceberg.ride_hailing.iceberg_ride_events;"`

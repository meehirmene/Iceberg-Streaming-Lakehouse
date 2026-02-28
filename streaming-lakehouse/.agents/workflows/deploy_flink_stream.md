---
description: Deploy a Flink SQL job to the local Flink cluster.
---
This workflow submits a Flink SQL stream processing job.

// turbo-all
1. Copy the SQL file to the jobmanager container:
   `docker cp flink/ride_hailing_job.sql jobmanager:/tmp/ride_hailing_job.sql`
2. Execute the SQL script using the Flink SQL client:
   `docker exec jobmanager /opt/flink/bin/sql-client.sh -f /tmp/ride_hailing_job.sql`

---
description: Run compaction and maintenance on Apache Iceberg tables via Trino.
---
This workflow runs backend optimizations to prevent the "small file problem" caused by high-frequency streaming checkpoints.

// turbo-all
1. Execute compaction for the `iceberg_surge_pricing` table via Trino CLI:
   `docker exec trino trino --execute "ALTER TABLE iceberg.ride_hailing.iceberg_surge_pricing EXECUTE optimize;"`
2. Execute compaction for the `iceberg_ride_events` table via Trino CLI:
   `docker exec trino trino --execute "ALTER TABLE iceberg.ride_hailing.iceberg_ride_events EXECUTE optimize;"`

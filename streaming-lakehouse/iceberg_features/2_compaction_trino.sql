-- Iceberg Table Maintenance using Trino

-- The Flink streaming job commits very frequently (every 10 seconds due to checkpointing).
-- Over time, this creates thousands of tiny Parquet and Avro (equality delete) files.
-- This degrades read performance. We fix this using the OPTIMIZE command (Compaction).

-- 1. Check current file sizes and counts
SELECT file_path, file_size_in_bytes, record_count 
FROM iceberg.ride_hailing."iceberg_ride_events$files";

-- 2. Execute Compaction (Rewrite Data Files)
-- This command reads all the small files and rewrites them into larger, optimized blocks.
-- In a production environment, this should run via a cron job or orchestrator (like Airflow) daily or hourly.
ALTER TABLE iceberg.ride_hailing.iceberg_ride_events EXECUTE optimize;

-- 3. Clean up old snapshots (Expire Snapshots)
-- Compaction creates new files, but the old ones are kept for time-travel.
-- To save S3 storage space, expire snapshots older than 7 days.
ALTER TABLE iceberg.ride_hailing.iceberg_ride_events 
EXECUTE expire_snapshots(retention_threshold => '7d');

-- 4. Clean up orphaned files
-- Sometimes files are written but the commit fails, leaving "orphaned" files in S3.
ALTER TABLE iceberg.ride_hailing.iceberg_ride_events EXECUTE remove_orphan_files(retention_threshold => '7d');

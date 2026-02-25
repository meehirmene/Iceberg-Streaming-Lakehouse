-- Time Travel in Apache Iceberg using Trino

-- 1. Snapshot-based Time Travel
-- Find the history of snapshots for our table:
SELECT * FROM iceberg.ride_hailing."iceberg_ride_events$snapshots" ORDER BY committed_at DESC;

-- Query the table as it was at a specific snapshot ID (replace with actual snapshot ID from above query):
-- SELECT * FROM iceberg.ride_hailing.iceberg_ride_events FOR VERSION AS OF 109238423498234;

-- 2. Timestamp-based Time Travel
-- Query the state of the table exactly 5 minutes ago:
SELECT * 
FROM iceberg.ride_hailing.iceberg_ride_events 
FOR TIMESTAMP AS OF (CURRENT_TIMESTAMP - INTERVAL '5' MINUTE);

-- 3. Time Travel to look at a specific driver's past state
-- Useful for debugging why a driver was marked "OFFLINE" at a very specific time
SELECT status, updated_at
FROM iceberg.ride_hailing.iceberg_ride_events 
FOR TIMESTAMP AS OF TIMESTAMP '2026-02-24 10:00:00 UTC'
WHERE driver_id = 'd-12345';

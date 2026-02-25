-- Enable Checkpointing to trigger Iceberg commits
SET 'execution.checkpointing.interval' = '10s';

-- 1. Setup Iceberg Catalog
CREATE CATALOG iceberg WITH (
  'type'='iceberg',
  'catalog-impl'='org.apache.iceberg.rest.RESTCatalog',
  'uri'='http://iceberg-rest:8181',
  'io-impl'='org.apache.iceberg.aws.s3.S3FileIO',
  'warehouse'='s3://lakehouse/',
  's3.endpoint'='http://minio:9000',
  's3.path-style-access'='true',
  's3.access-key'='admin',
  's3.secret-key'='password'
);

-- 2. Define Kafka Source: Driver Locations (with Watermarks) in default catalog
CREATE TABLE source_driver_locations (
    driver_id STRING,
    lat DOUBLE,
    lon DOUBLE,
    status STRING,
    event_timestamp_str STRING,
    driver_event_time AS CAST(event_timestamp_str AS TIMESTAMP(3)),
    WATERMARK FOR driver_event_time AS driver_event_time - INTERVAL '5' SECOND
) WITH (
    'connector' = 'kafka',
    'topic' = 'driver_locations',
    'properties.bootstrap.servers' = 'kafka:29092',
    'properties.group.id' = 'flink-driver-cg',
    'scan.startup.mode' = 'latest-offset',
    'format' = 'json'
);

-- 3. Define Kafka Source: Ride Requests (with Watermarks) in default catalog
CREATE TABLE source_ride_requests (
    ride_id STRING,
    user_id STRING,
    lat DOUBLE,
    lon DOUBLE,
    status STRING,
    event_timestamp_str STRING,
    ride_event_time AS CAST(event_timestamp_str AS TIMESTAMP(3)),
    WATERMARK FOR ride_event_time AS ride_event_time - INTERVAL '5' SECOND
) WITH (
    'connector' = 'kafka',
    'topic' = 'ride_requests',
    'properties.bootstrap.servers' = 'kafka:29092',
    'properties.group.id' = 'flink-ride-cg',
    'scan.startup.mode' = 'latest-offset',
    'format' = 'json'
);

USE CATALOG iceberg;
CREATE DATABASE IF NOT EXISTS ride_hailing;
USE ride_hailing;

-- 4. Define Iceberg Sink: Ride Status Tracking (Upserts enabled)
CREATE TABLE IF NOT EXISTS iceberg_ride_events (
    ride_id STRING,
    user_id STRING,
    driver_id STRING,
    status STRING,
    request_lat DOUBLE,
    request_lon DOUBLE,
    updated_at TIMESTAMP(3),
    PRIMARY KEY (ride_id) NOT ENFORCED
) WITH (
    'format-version' = '2',
    'write.upsert.enabled' = 'true'
);

-- 5. Define Iceberg Sink: Surge Pricing Aggregates (Append only is fine here)
CREATE TABLE IF NOT EXISTS iceberg_surge_pricing (
    window_start TIMESTAMP(3),
    window_end TIMESTAMP(3),
    demand_count BIGINT,
    supply_count BIGINT,
    surge_multiplier DOUBLE
) WITH (
    'format-version' = '2'
);

-- 6. Execute Stateful Interval Join & Sliding Window Aggregation concurrently
EXECUTE STATEMENT SET BEGIN

-- Insert 1: Matching Rides to Drivers within 5 minutes
-- Write results directly to Iceberg as Upserts (Ride state updates)
INSERT INTO iceberg_ride_events
SELECT 
    r.ride_id,
    r.user_id,
    d.driver_id,
    r.status,
    r.lat as request_lat,
    r.lon as request_lon,
    r.ride_event_time as updated_at
FROM default_catalog.default_database.source_ride_requests r
LEFT JOIN default_catalog.default_database.source_driver_locations d
ON r.status = 'ACCEPTED' AND d.status = 'ON_TRIP' 
   AND r.ride_event_time BETWEEN d.driver_event_time - INTERVAL '5' MINUTE AND d.driver_event_time + INTERVAL '5' MINUTE;

-- Insert 2: Surge Pricing
-- Calculate supply and demand over a 60 second window, sliding every 10 seconds
INSERT INTO iceberg_surge_pricing
WITH rider_windows AS (
    SELECT window_start, window_end, COUNT(DISTINCT ride_id) as demand_count
    FROM TABLE(HOP(TABLE default_catalog.default_database.source_ride_requests, DESCRIPTOR(ride_event_time), INTERVAL '10' SECOND, INTERVAL '60' SECOND))
    GROUP BY window_start, window_end
),
driver_windows AS (
    SELECT window_start, window_end, COUNT(DISTINCT driver_id) as supply_count
    FROM TABLE(HOP(TABLE default_catalog.default_database.source_driver_locations, DESCRIPTOR(driver_event_time), INTERVAL '10' SECOND, INTERVAL '60' SECOND))
    GROUP BY window_start, window_end
)
SELECT 
    COALESCE(rw.window_start, dw.window_start) as window_start,
    COALESCE(rw.window_end, dw.window_end) as window_end,
    COALESCE(rw.demand_count, 0) as demand_count,
    COALESCE(dw.supply_count, 0) as supply_count,
    CASE 
        WHEN COALESCE(dw.supply_count, 0) = 0 THEN 3.0
        ELSE LEAST(3.0, GREATEST(1.0, CAST(COALESCE(rw.demand_count, 0) AS DOUBLE) / CAST(COALESCE(dw.supply_count, 1) AS DOUBLE)))
    END as surge_multiplier
FROM rider_windows rw
FULL OUTER JOIN driver_windows dw
ON rw.window_start = dw.window_start AND rw.window_end = dw.window_end;

END;

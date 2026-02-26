-- 0. Setup Iceberg Catalog
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

-- 1. Create the Kafka Source Table for Ecommerce Events
CREATE TABLE ecommerce_kafka_source (
    `event_id` STRING,
    `user_id` STRING,
    `product_id` STRING,
    `category` STRING,
    `event_type` STRING,     -- 'add_to_cart' or 'checkout'
    `price` DOUBLE,
    `event_timestamp` TIMESTAMP(3),
    -- Event time attribute and watermark for windowing
    WATERMARK FOR `event_timestamp` AS `event_timestamp` - INTERVAL '5' SECOND
) WITH (
    'connector' = 'kafka',
    'topic' = 'ecommerce_events',
    'properties.bootstrap.servers' = 'kafka:29092',
    'properties.group.id' = 'flink_ecommerce_group',
    'format' = 'json',
    'scan.startup.mode' = 'latest-offset'
);

-- 2. Create the target Iceberg Database/Schema if it doesn't exist
CREATE DATABASE IF NOT EXISTS iceberg.ecommerce;

-- 3. Create the Iceberg Target Table: Live Cart Metrics (Aggregated)
-- This table stores sliding window aggregations
CREATE TABLE IF NOT EXISTS iceberg.ecommerce.live_cart_metrics (
    `window_start` TIMESTAMP(3),
    `window_end` TIMESTAMP(3),
    `total_adds` BIGINT,
    `total_checkouts` BIGINT,
    `abandonment_rate` DOUBLE,
    `recent_revenue` DOUBLE,
    PRIMARY KEY (`window_end`) NOT ENFORCED
) WITH (
    'format-version'='2',
    'write.upsert.enabled'='true'
);

-- 4. Create an Iceberg Target Table: Raw Events Log
-- Helpful for a "Recent Activity" feed in the UI
CREATE TABLE IF NOT EXISTS iceberg.ecommerce.recent_events (
    `event_id` STRING,
    `user_id` STRING,
    `product_id` STRING,
    `category` STRING,
    `event_type` STRING,
    `price` DOUBLE,
    `event_time` TIMESTAMP(3),
    PRIMARY KEY (`event_id`) NOT ENFORCED
) WITH (
    'format-version'='2',
    'write.upsert.enabled'='true'
);

-- 5. Start the Streaming Jobs (Statement Set for concurrent execution)
BEGIN STATEMENT SET;

-- Insert aggregated metrics using a Sliding (Hopping) Window
-- We look back 1 Minute, updating every 10 Seconds
INSERT INTO iceberg.ecommerce.live_cart_metrics
SELECT
    window_start,
    window_end,
    SUM(CASE WHEN event_type = 'add_to_cart' THEN 1 ELSE 0 END) AS total_adds,
    SUM(CASE WHEN event_type = 'checkout' THEN 1 ELSE 0 END) AS total_checkouts,
    -- Avoid division by zero
    CAST(SUM(CASE WHEN event_type = 'add_to_cart' THEN 1 ELSE 0 END) - SUM(CASE WHEN event_type = 'checkout' THEN 1 ELSE 0 END) AS DOUBLE) / 
    NULLIF(SUM(CASE WHEN event_type = 'add_to_cart' THEN 1 ELSE 0 END), 0) AS abandonment_rate,
    SUM(CASE WHEN event_type = 'checkout' THEN price ELSE 0 END) AS recent_revenue
FROM TABLE(
    HOP(TABLE ecommerce_kafka_source, DESCRIPTOR(event_timestamp), INTERVAL '10' SECONDS, INTERVAL '1' MINUTES)
)
GROUP BY window_start, window_end;

-- Continuously sink raw events for the feed
INSERT INTO iceberg.ecommerce.recent_events
SELECT 
    event_id,
    user_id,
    product_id,
    category,
    event_type,
    price,
    event_timestamp AS event_time
FROM ecommerce_kafka_source;

END;

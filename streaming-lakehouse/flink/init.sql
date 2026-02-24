CREATE CATALOG iceberg WITH (
  'type'='iceberg',
  'catalog-impl'='org.apache.iceberg.rest.RESTCatalog',
  'uri'='http://iceberg-rest:8181',
  'warehouse'='s3://lakehouse/',
  'io-impl'='org.apache.iceberg.aws.s3.S3FileIO',
  's3.endpoint'='http://minio:9000',
  's3.access-key'='admin',
  's3.secret-key'='password',
  's3.path-style-access'='true',
  'client.region'='us-east-1'
);

USE CATALOG iceberg;
CREATE DATABASE IF NOT EXISTS default_db;
USE default_db;

USE CATALOG default_catalog;

CREATE TABLE events_source (
    `event_id` STRING,
    `user_id` BIGINT,
    `url` STRING,
    `timestamp` BIGINT,
    `revenue` DOUBLE,
    `ts_ltz` AS TO_TIMESTAMP_LTZ(`timestamp`, 3),
    WATERMARK FOR `ts_ltz` AS `ts_ltz` - INTERVAL '5' SECOND
) WITH (
    'connector' = 'kafka',
    'topic' = 'events',
    'properties.bootstrap.servers' = 'kafka:29092',
    'properties.group.id' = 'flink_consumer_group',
    'scan.startup.mode' = 'earliest-offset',
    'format' = 'json'
);

USE CATALOG iceberg;
CREATE DATABASE IF NOT EXISTS default_db;
USE default_db;

CREATE TABLE IF NOT EXISTS events_iceberg (
    `event_id` STRING,
    `user_id` BIGINT,
    `url` STRING,
    `event_time` TIMESTAMP(3),
    `revenue` DOUBLE
) WITH (
    'format-version'='2'
);

SET 'execution.checkpointing.interval' = '10s';

INSERT INTO iceberg.default_db.events_iceberg
SELECT 
    event_id, 
    user_id, 
    url, 
    ts_ltz, 
    revenue 
FROM default_catalog.default_database.events_source;

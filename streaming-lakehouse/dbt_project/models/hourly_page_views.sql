{{ config(materialized='table') }}

SELECT
    url,
    date_trunc('hour', event_time) AS event_hour,
    count(event_id) AS total_events,
    sum(revenue) AS total_revenue,
    count(distinct user_id) AS unique_users
FROM 
    iceberg.default_db.events_iceberg
GROUP BY
    1, 2

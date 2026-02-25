-- models/surge_pricing/daily_driver_payouts_staging.sql

{{ config(
    materialized='table',
    properties={
        "format": "'PARQUET'",
        "partitioning": "ARRAY['day(payout_date)']"
    }
) }}

-- In a Write-Audit-Publish (WAP) pattern, we write to a "staging" table first.
-- dbt will run tests against this staging table. If tests pass, we could use an orchestrator 
-- or Iceberg branching to fast-forward the data to the main production branch.

WITH completed_rides AS (
    SELECT 
        ride_id,
        driver_id,
        updated_at
    FROM iceberg.ride_hailing.iceberg_ride_events
    WHERE status = 'COMPLETED'
),

surge_data AS (
    SELECT 
        window_start,
        window_end,
        surge_multiplier
    FROM iceberg.ride_hailing.iceberg_surge_pricing
),

-- Join rides with the surge multiplier active at the time of completion (simulated)
rides_with_surge AS (
    SELECT 
        r.ride_id,
        r.driver_id,
        CAST(r.updated_at AS DATE) AS payout_date,
        COALESCE(s.surge_multiplier, 1.0) AS applied_surge -- default to 1x if no surge record matches exactly
    FROM completed_rides r
    LEFT JOIN surge_data s
    ON r.updated_at BETWEEN s.window_start AND s.window_end
)

SELECT 
    driver_id,
    payout_date,
    COUNT(ride_id) AS total_rides_completed,
    -- Assume a flat base fare of $10 for simplicity
    -- Uses the custom Jinja macro to calculate the final payout after 20% commission
    SUM( {{ calculate_driver_payout(10.0, 'applied_surge') }} ) AS total_payout
FROM rides_with_surge
GROUP BY 1, 2

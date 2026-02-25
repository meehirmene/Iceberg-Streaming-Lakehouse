-- macros/pricing_macros.sql

-- This macro calculates the final payout for a driver based on the base fare, 
-- ride distance (simulated here as a flat fee component), and the surge multiplier.
{% macro calculate_driver_payout(base_fare, surge_multiplier, commission_rate=0.20) %}
    -- Driver gets the fare multiplied by surge, minus the platform commission
    ROUND( ( {{ base_fare }} * {{ surge_multiplier }} ) * (1.0 - {{ commission_rate }}), 2)
{% endmacro %}

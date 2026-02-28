---
description: Execute dbt analytics models and tests against the lakehouse.
---
This workflow runs the analytics engineering layer using dbt.

// turbo-all
1. Navigate to the `dbt_project` directory and install dependencies:
   `cd dbt_project && dbt deps`
2. Run the dbt models targeting the Trino engine:
   `cd dbt_project && dbt run`
3. Execute dbt tests to ensure data quality and constraints:
   `cd dbt_project && dbt test`

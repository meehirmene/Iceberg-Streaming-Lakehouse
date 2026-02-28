---
description: Generate a beautiful, use-case-specific real-time dashboard for the frontend.
---
This workflow generates a modern, dynamic React dashboard tailored to a specific streaming use case (e.g., ride-hailing maps, e-commerce live sales, IoT sensor heatmaps) by connecting directly to Trino/Iceberg.

When triggered, the agent should perform the following steps:

1. **Understand the Use Case**: 
   - Ask the user for the target use case (e.g., "e-commerce", "fraud detection", "ride-hailing").
   - Ask what specific Iceberg tables or Trino queries will power the live dashboard.

2. **Data Generation & Backend Pipeline**:
   - Write a new Python Kafka producer to generate simulated data for the specific use case.
   - Write a new Flink SQL job (`.sql` file) to ingest this specific topic, perform business logic windowing, and sink it into a new Iceberg table.
   - Wait for you to deploy the job so the table registers in Trino.

3. **Design the UI Experience**: 
   - If necessary, read the existing Vite/React frontend structure located in `frontend/`.
   - Create new React components under `frontend/src/pages/` or `frontend/src/components/`.
   - Wire up the component to utilize the existing Trino proxy polling logic (using hooks or simple fetch calls on intervals) to query the lakehouse asynchronously.

4. **Update Routing**:
   - Register the new dashboard route in the main application router (e.g., `frontend/src/App.jsx`).

5. **Apply Premium Styling**:
   - Add the necessary CSS classes to implement dynamic micro-animations, sleek gradients, and responsive layouts that "wow" the user.

6. **Verify and Run**:
   - Validate that the dashboard compiles successfully by running `npm run build` or checking the dev server.
   - Point the user to the correct URL (e.g., `http://localhost:5173/use-case-name`) to see the live metrics updating.

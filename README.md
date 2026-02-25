# Advanced Streaming Data Lakehouse: Ride-Hailing

Welcome to the **Ride-Hailing Streaming Data Lakehouse** project. This repository demonstrates a production-scale streaming architecture processing live telemetry and surge pricing metrics using an open-source data stack.

The data engineering landscape is undergoing a massive shift. The traditional boundaries between "streaming" (for low-latency operations) and "batch" (for historical analytics) are dissolving. Enter the **Streaming Data Lakehouse**—an architecture that delivers real-time analytical capabilities directly on top of open table formats like Apache Iceberg, without the need for bespoke, expensive operational databases.

## The Use Case: Ride-Hailing Telemetry & Surge Pricing

Imagine a ride-hailing platform like Uber or Lyft. At any given second, thousands of drivers are pinging their GPS locations, and thousands of riders are requesting rides. To operate efficiently, the platform must process these streams in real-time to achieve two critical goals:
1. **Ride Matching & State Tracking**: Instantly match a rider's request with a nearby driver and track the live state of that ride (Requested -> Accepted -> Completed).
2. **Surge Pricing Calculation**: Dynamically calculate pricing multipliers continuously based on the real-time supply of drivers versus the demand from riders in specific geographic zones.

Historically, solving this required a complex labyrinth of Kafka streams, NoSQL databases (like Cassandra or DynamoDB) for state tracking, and separate data warehouses for downstream analytics.

With the advent of advanced table formats like **Apache Iceberg V2**, we can now process these streams and mutate records directly in the data lake, achieving sub-second latency while keeping everything in a unified, open format.

## Architectural Overview

We designed a modern, open-source stack that processes these events as they arrive, handles out-of-order data, mutates lakehouse records in real-time, and serves a live React dashboard—all without a traditional database.

![Architecture Diagram](./assets/architecture_diagram.png)

## Tools and Functionality Developed

Let's break down the role of each component and the specific functionalities we developed to conquer this use case.

### 1. Ingestion: Apache Kafka & Python Producers
To simulate the high-throughput, chaotic nature of mobile telemetry, we built Python producers that continuously push `driver_locations` and `ride_requests` into **Apache Kafka**.
- **Key-Based Routing**: Crucially, we route messages using `driver_id` and `ride_id` as Kafka keys. This ensures that state transitions for a single ride arrive at the stream processor in strictly chronological order.

### 2. Stream Processing: Apache Flink SQL
**Apache Flink** is the powerful engine executing our continuous queries. We utilized Flink SQL to handle the heavy lifting:
- **Event-Time Watermarking**: Mobile networks are notoriously unreliable. Flink uses a 5-second watermark (`WATERMARK FOR event_timestamp AS event_timestamp - INTERVAL '5' SECOND`) which allows the system to wait for and gracefully process out-of-order "late" pings without stalling the pipeline.
- **Stateful Interval Joins**: To match riders and drivers, Flink holds streams in state and executes an `INTERVAL JOIN`. It looks for an 'ACCEPTED' ride request and an 'ON_TRIP' driver location occurring within 5 minutes of each other, seamlessly matching supply to demand.
- **Sliding (Hopping) Windows**: Flink calculates the "Surge Multiplier" continuously by aggregating the distinct counts of active riders and available drivers using a **60-second lookback window that slides forward every 10 seconds**.

### 3. Unified Storage: Apache Iceberg V2
This is where the lakehouse magic happens. Traditionally, data lakes were append-only.
- **V2 Format & Live Upserts**: We configured our Iceberg tables with `'format-version'='2'` and `'write.upsert.enabled'='true'`. Flink directly issues **Equality Deletes** to the lake. When a ride goes from 'REQUESTED' to 'COMPLETED', Iceberg updates the existing row in place in real-time.
- **Advanced Features Implemented**:
  - **Partition Evolution**: We demonstrated shifting a table from daily to hourly partitioning seamlessly without requiring massive rewrites of historical data.
  - **Compaction**: Flink checkpointing every 10s creates thousands of tiny files ("the small file problem"). We automated `ALTER TABLE ... EXECUTE OPTIMIZE` commands to periodically compact these files into optimized blocks behind the scenes.
  - **Time Travel**: Because Iceberg tracks snapshots, we configured exact time-travel queries to audit exactly what the surge pricing multiplier was at any given millisecond in the past.

### 4. Query Engine: Trino
**Trino** acts as the high-concurrency, massively parallel SQL query engine sitting directly over the Iceberg metadata and MinIO object storage. It serves as the single source of truth, providing rapid query responses to our visualization layer without caching data externally.

### 5. Analytics & Quality: dbt (Data Build Tool)
We integrated **dbt** to manage the analytics engineering workflow on top of the raw lakehouse tables:
- **Custom Macros & Tests**: We built Jinja macros to calculate driver payouts dynamically based on surge factors.
- **WAP Pattern**: Integrated strict data quality tests (e.g., asserting unique ride IDs and acceptable state values) using a Write-Audit-Publish pattern to ensure downtown analytics tables are pristine.

### 6. Serving: React Live Dashboard
Finally, we brought the data to life using a modern **Vite + React** web application.
- The UI polls Trino via an asynchronous REST client.
- It translates Flink's 10-second sliding windows into live-updating KPI cards and a real-time tracking feed of active ride states.

## Getting Started

### Prerequisites
- Docker & Docker Compose
- Python 3.9+
- Node.js & npm

### Bringing up the local cluster
1. Ensure your docker engine has sufficient memory allocated (**12GB - 16GB minimum** recommended).
2. Start the core infrastructure components:
   ```bash
   docker-compose up -d
   ```
3. Wait up to 3 minutes for Trino and Flink TaskManagers to become healthy.

### Running the pipelines
1. **Start the Kafka Producers**:
   ```bash
   pip install kafka-python
   python3 producer/ride_hailing_producer.py
   ```
2. **Submit the Flink Job**:
   ```bash
   docker cp flink/ride_hailing_job.sql jobmanager:/tmp/ride_hailing_job.sql
   docker exec jobmanager /opt/flink/bin/sql-client.sh -f /tmp/ride_hailing_job.sql
   ```
3. **Run Iceberg Compaction** (if Trino queries slow down due to Flink checkpointing frequency):
   ```sql
   -- Run inside Trino CLI
   ALTER TABLE iceberg.ride_hailing.iceberg_surge_pricing EXECUTE optimize;
   ALTER TABLE iceberg.ride_hailing.iceberg_ride_events EXECUTE optimize;
   ```

### Accessing the Dashboard
Start the Vite React application:
```bash
cd frontend
npm install
npm run dev
```
Navigate to `http://localhost:5173` to see the live metrics and stream data.

### Demo Dashboard

![Dashboard Demo](assets/dashboard_demo.webp)
*Real-time streaming dashboard built with React and Trino*

![Routing Demo](assets/routing_demo.webp)
*Navigate seamlessly between the Overview, Raw Streams, and Settings pages.*

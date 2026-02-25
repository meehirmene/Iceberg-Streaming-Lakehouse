# Advanced Streaming Data Lakehouse: Ride-Hailing V2

Welcome to the **Ride-Hailing Streaming Data Lakehouse** project. This repository demonstrates a production-scale streaming architecture processing live telemetry and surge pricing metrics using an open-source data stack.

## Architecture Architecture

This project maps streaming events directly to a data lakehouse pattern without traditional intermediate databases.

- **Ingestion**: Apache Kafka
  - Simulates driver telemetry and user ride requests.
  - Python Producers ensure key-based routing (`driver_id`, `ride_id`) for chronological ordering.
- **Stream Processing**: Apache Flink (Stateful Processing & SQL)
  - Intercepts late-arriving data using Event Time Watermarking.
  - Performs **Interval Joins** matching ride requests to available drivers within a 5-minute sliding window.
  - Calculates Surge Pricing multipliers using **Hopping Windows** (60s lookback, sliding every 10s).
  - Configured with `RocksDB` state backend and Checkpointing to MinIO for exactly-once guarantees.
- **Storage Layer**: Apache Iceberg & MinIO (S3)
  - Built with **Iceberg V2** format, enabling live **UPSERTS** via Equality Deletes. Flink directly mutates state transitions (e.g., Requested -> Accepted -> Completed).
  - Showcases advanced Iceberg features: Partition Evolution, Compaction, and Time Travel.
- **Query Engine**: Trino
  - Provides ANSI SQL access across the entire lakehouse with sub-second latency after compaction.
- **Analytics**: dbt (Data Build Tool)
  - Custom Jinja macros encapsulate surge logic and handle complex data testing.
- **Frontend App**: React & Vite
  - A real-time dashboard visualizing Flink's aggregated Hopping Windows and Iceberg's live state updates using a custom async Trino REST polling client.

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

## Note on Memory Limitations
When running the full stack natively on a single Docker node, Flink `STATEMENT SETS` (containing concurrent Interval Joins and Sliding Windows) coupled with a full Trino JVM and Iceberg API processes can easily consume local engine limits. If containers are ungracefully terminating with `OOM Killed (Exit 137)`, consider pausing non-essential services or increasing Docker's memory footprint.


### Demo Dashboard

![Dashboard Demo](assets/dashboard_demo.webp)
*Real-time streaming dashboard built with React and Trino*

![Routing Demo](assets/routing_demo.webp)
*Navigate seamlessly between the Overview, Raw Streams, and Settings pages.*

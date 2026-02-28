---
description: Start Python Kafka producers to generate simulated streaming telemetry.
---
This workflow floods the Kafka topics with simulated ride requests and driver locations.

// turbo-all
1. Install the necessary Python dependencies for the producer script:
   `pip install kafka-python`
2. Start the producer script (runs continuously):
   `python3 producer/ride_hailing_producer.py`

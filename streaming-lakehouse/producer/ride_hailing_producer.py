import json
import time
import random
import uuid
from datetime import datetime
from kafka import KafkaProducer

# Configuration
KAFKA_BROKER = 'localhost:9092'
DRIVER_TOPIC = 'driver_locations'
RIDE_TOPIC = 'ride_requests'

# Setup Producer
producer = KafkaProducer(
    bootstrap_servers=[KAFKA_BROKER],
    value_serializer=lambda v: json.dumps(v).encode('utf-8'),
    key_serializer=lambda k: k.encode('utf-8')
)

# San Francisco bounding box roughly
LAT_MIN, LAT_MAX = 37.70, 37.81
LON_MIN, LON_MAX = -122.51, -122.38

# State to simulate active riders and drivers
drivers = [str(uuid.uuid4()) for _ in range(50)]
users = [str(uuid.uuid4()) for _ in range(100)]
active_rides = {} # ride_id -> state

def random_location():
    return round(random.uniform(LAT_MIN, LAT_MAX), 5), round(random.uniform(LON_MIN, LON_MAX), 5)

print("Starting Ride-Hailing Telemetry Producer...")
try:
    while True:
        now = datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S.%f')[:-3]
        
        # 1. Emit driver locations (every iteration, a subset of drivers updates location)
        for driver_id in random.sample(drivers, 10):
            lat, lon = random_location()
            status = random.choice(["AVAILABLE", "AVAILABLE", "ON_TRIP"])
            
            event = {
                "driver_id": driver_id,
                "lat": lat,
                "lon": lon,
                "status": status,
                "event_timestamp_str": now
            }
            # Key-based routing ensures same driver events go to same partition
            producer.send(DRIVER_TOPIC, key=driver_id, value=event)

        # 2. Emit ride requests and state changes
        # Occasional new ride request
        if random.random() < 0.2:
            ride_id = str(uuid.uuid4())
            user_id = random.choice(users)
            lat, lon = random_location()
            
            event = {
                "ride_id": ride_id,
                "user_id": user_id,
                "lat": lat,
                "lon": lon,
                "status": "REQUESTED",
                "event_timestamp_str": now
            }
            active_rides[ride_id] = "REQUESTED"
            producer.send(RIDE_TOPIC, key=ride_id, value=event)
            print(f"Ride {ride_id} requested.")

        # Simulate ride state progression
        completed_rides = []
        for ride_id, status in active_rides.items():
            if status == "REQUESTED" and random.random() < 0.4:
                active_rides[ride_id] = "ACCEPTED"
                event = {
                    "ride_id": ride_id,
                    "user_id": "dummy", # user_id normally carried over or lookup
                    "lat": 0.0,
                    "lon": 0.0,
                    "status": "ACCEPTED",
                    "event_timestamp_str": now
                }
                producer.send(RIDE_TOPIC, key=ride_id, value=event)
            elif status == "ACCEPTED" and random.random() < 0.2:
                active_rides[ride_id] = "COMPLETED"
                event = {
                    "ride_id": ride_id,
                    "user_id": "dummy",
                    "lat": 0.0,
                    "lon": 0.0,
                    "status": "COMPLETED",
                    "event_timestamp_str": now
                }
                producer.send(RIDE_TOPIC, key=ride_id, value=event)
                completed_rides.append(ride_id)
        
        for ride_id in completed_rides:
            del active_rides[ride_id]

        producer.flush()
        time.sleep(1)

except KeyboardInterrupt:
    print("Producer stopped.")
finally:
    producer.close()

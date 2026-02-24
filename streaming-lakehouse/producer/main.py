import json
import time
import random
from kafka import KafkaProducer
from faker import Faker

fake = Faker()

def get_producer():
    for _ in range(30):
        try:
            return KafkaProducer(
                bootstrap_servers='localhost:9092',
                value_serializer=lambda v: json.dumps(v).encode('utf-8')
            )
        except Exception as e:
            print("Waiting for Kafka...")
            time.sleep(2)
    raise Exception("Could not connect to Kafka")

producer = get_producer()

TOPIC = 'events'

def generate_event():
    return {
        "event_id": fake.uuid4(),
        "user_id": random.randint(1, 1000),
        "url": random.choice(["/home", "/product", "/cart", "/checkout", "/blog"]),
        "timestamp": fake.unix_time(),
        "revenue": round(random.uniform(10.0, 500.0), 2)
    }

if __name__ == "__main__":
    print(f"Starting to produce events to {TOPIC}...")
    try:
        while True:
            event = generate_event()
            producer.send(TOPIC, event)
            print(f"Sent: {event}")
            time.sleep(1)
    except KeyboardInterrupt:
        print("Stopping producer.")
    finally:
        producer.flush()
        producer.close()

import json
import time
import uuid
import random
from kafka import KafkaProducer
from datetime import datetime

# Configure Kafka Producer
producer = KafkaProducer(
    bootstrap_servers='localhost:9092',
    value_serializer=lambda v: json.dumps(v).encode('utf-8'),
    key_serializer=lambda k: k.encode('utf-8')
)

TOPIC_NAME = 'ecommerce_events'
PRODUCT_CATEGORIES = ['Electronics', 'Clothing', 'Home', 'Books', 'Toys']
PRODUCTS = [f"Product_{i}" for i in range(1, 51)]

print(f"Starting Ecommerce Simulator. Producing to topic: {TOPIC_NAME}")

def generate_event():
    user_id = f"user_{random.randint(1000, 9999)}"
    product_id = random.choice(PRODUCTS)
    category = random.choice(PRODUCT_CATEGORIES)
    
    # 70% chance to add to cart, 30% chance to checkout
    # In reality, checkouts usually follow add_to_carts, but for simulating a continuous funnel 
    # we'll generate independent events that Flink can window to find abandonment ratios.
    event_type = "checkout" if random.random() < 0.3 else "add_to_cart"
    
    price = round(random.uniform(10.0, 500.0), 2)

    event = {
        "event_id": str(uuid.uuid4()),
        "user_id": user_id,
        "product_id": product_id,
        "category": category,
        "event_type": event_type,
        "price": price,
        "event_timestamp": datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S.%f')[:-3]
    }
    
    return user_id, event

try:
    while True:
        key, event = generate_event()
        # Keying by user_id ensures events for the same user go to the same partition
        producer.send(TOPIC_NAME, key=key, value=event)
        
        # Print every 50 events to show progress
        if random.random() < 0.05:
            print(f"Sent: {event['event_type']} - User: {event['user_id']} - ${event['price']}")
            
        time.sleep(random.uniform(0.1, 0.5)) 

except KeyboardInterrupt:
    print("Producer stopped.")
finally:
    producer.flush()
    producer.close()

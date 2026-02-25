from pyspark.sql import SparkSession

# This script demonstrates how to perform Partition Evolution in Apache Iceberg using PySpark.
# 
# Scenario:
# We originally partitioned `iceberg_ride_events` by `days(updated_at)`.
# However, as data volume grew massively, daily partitions became too large to process efficiently.
# We want to dynamically evolve the partition scheme to `hours(updated_at)` without rewriting historical data!

# Initialize Spark with Iceberg Configurations
spark = SparkSession.builder \
    .appName("Iceberg Partition Evolution") \
    .config("spark.sql.extensions", "org.apache.iceberg.spark.extensions.IcebergSparkSessionExtensions") \
    .config("spark.sql.catalog.iceberg", "org.apache.iceberg.spark.SparkCatalog") \
    .config("spark.sql.catalog.iceberg.type", "rest") \
    .config("spark.sql.catalog.iceberg.uri", "http://localhost:8181") \
    .config("spark.sql.catalog.iceberg.io-impl", "org.apache.iceberg.aws.s3.S3FileIO") \
    .config("spark.sql.catalog.iceberg.s3.endpoint", "http://localhost:9000") \
    .config("spark.sql.catalog.iceberg.s3.path-style-access", "true") \
    .getOrCreate()

# 1. View the current partition spec
print("Current Partition Spec:")
spark.sql("DESCRIBE FORMATTED iceberg.ride_hailing.iceberg_ride_events").show(truncate=False)

# 2. EVOLVE THE PARTITION
# Add a new partition field for hourly partitioning.
print("Evolving partition to hourly...")
spark.sql("""
    ALTER TABLE iceberg.ride_hailing.iceberg_ride_events 
    ADD PARTITION FIELD hours(updated_at)
""")

# Note: Iceberg retains the old 'days(updated_at)' for historical reads, 
# but new data written by Flink or Spark will automatically use 'hours(updated_at)'.
# This allows readers to seamlessly query across both the old partition layout and the new one.

# 3. (Optional) Remove the old partition field if we ONLY want hourly going forward
# spark.sql("""
#     ALTER TABLE iceberg.ride_hailing.iceberg_ride_events 
#     DROP PARTITION FIELD days(updated_at)
# """)

print("Partition evolution successful!")
spark.stop()

# import pandas as pd
# from pymongo import MongoClient

# # -------------------------------
# # 1. Connect to MongoDB
# # -------------------------------
# client = MongoClient("mongodb://localhost:27017/")
# db = client["stock_market"]
# collection = db["stock_master"]

# print("Connected to MongoDB")

# # -------------------------------
# # 2. Read CSV
# # -------------------------------
# df = pd.read_csv("/Users/ag/Desktop/Quant Project/QuantEngine/backend/data/stocks_master.csv")

# print(f"Loaded {len(df)} rows from CSV")

# # -------------------------------
# # 3. Clean column names
# # -------------------------------
# df.columns = (
#     df.columns
#     .str.strip()
#     .str.lower()
#     .str.replace(" ", "_")
# )

# # Example:
# # "Company Name" -> "company_name"
# # "Sector indexes" -> "sector_indexes"

# # -------------------------------
# # 4. Remove duplicate symbols
# # -------------------------------
# if "symbol" in df.columns:
#     df = df.drop_duplicates(subset=["symbol"])
# else:
#     raise ValueError("CSV must contain a 'Symbol' column")

# # -------------------------------
# # 5. Replace NaN values
# # -------------------------------
# df = df.fillna("")

# # -------------------------------
# # 6. Convert DataFrame to dict
# # -------------------------------
# records = df.to_dict(orient="records")

# print(f"Preparing to insert {len(records)} records")

# # -------------------------------
# # 7. Create index for symbol
# # -------------------------------
# collection.create_index("symbol", unique=True)

# # -------------------------------
# # 8. Insert / Update records
# # -------------------------------
# count = 0

# for record in records:
#     symbol_value = record.get("symbol") or record.get("Symbol")

#     if symbol_value:
#         collection.update_one(
#             {"symbol": symbol_value},
#             {"$set": record},
#             upsert=True
#         )
#         count += 1

# print(f"{count} stocks inserted/updated successfully")

# print("Stock master data loaded into MongoDB")
import pandas as pd
from pymongo import MongoClient
import ast

# -------------------------------
# 1. Connect to MongoDB
# -------------------------------
client = MongoClient("mongodb://localhost:27017/")
db = client["stock_market"]
collection = db["stock_master"]

print("Connected to MongoDB")

# -------------------------------
# 2. Read CSV
# -------------------------------
df = pd.read_csv("/Users/ag/Desktop/Quant Project/QuantEngine/backend/data/stocks_master.csv")

print(f"Loaded {len(df)} rows from CSV")

# -------------------------------
# 3. Clean column names
# -------------------------------
df.columns = (
    df.columns
    .str.strip()
    .str.lower()
    .str.replace(" ", "_")
)

# -------------------------------
# 4. Remove duplicate symbols
# -------------------------------
if "symbol" in df.columns:
    df = df.drop_duplicates(subset=["symbol"])
else:
    raise ValueError("CSV must contain a 'symbol' column")

# -------------------------------
# 5. Replace NaN values
# -------------------------------
df = df.fillna("")

# -------------------------------
# 6. FIX index column (IMPORTANT)
# -------------------------------
if "index" in df.columns:
    def parse_index(x):
        try:
            if isinstance(x, str) and x.startswith("["):
                return ast.literal_eval(x)   # convert string → list
            elif isinstance(x, str) and x != "":
                return [x]  # single value → list
            return []
        except:
            return []

    df["index"] = df["index"].apply(parse_index)

# -------------------------------
# 7. Convert DataFrame to dict
# -------------------------------
records = df.to_dict(orient="records")

print(f"Preparing to insert {len(records)} records")

# -------------------------------
# 8. Create indexes
# -------------------------------
collection.create_index("symbol", unique=True)
collection.create_index("index")   # 🔥 important for fast queries

# -------------------------------
# 9. Insert / Update records
# -------------------------------
count = 0

for record in records:
    symbol_value = record.get("symbol")

    if symbol_value:
        collection.update_one(
            {"symbol": symbol_value},
            {"$set": record},
            upsert=True
        )
        count += 1

print(f"{count} stocks inserted/updated successfully")
print("Stock master data loaded into MongoDB")
import pandas as pd
from collections import defaultdict

# Load CSV exported from Google Sheets
df = pd.read_csv("stocks_master.csv")

index_dict = defaultdict(list)
sector_dict = defaultdict(list)

for _, row in df.iterrows():

    symbol = row["Symbol"]
    name = row["Company Name"]
    industry = row["Industry"]

    # ----- Handle Indices -----
    if pd.notna(row["Indexes"]):
        indices = [i.strip() for i in row["Indexes"].split(",")]

        for idx in indices:
            index_dict[idx].append({
                "symbol": symbol,
                "name": name,
                "sector": industry,
                "index": idx
            })

    # ----- Handle Sector Indices -----
    if pd.notna(row["Sector indexes"]):
        sectors = [s.strip() for s in str(row["Sector indexes"]).split(",") if s.strip()]

        for sec in sectors:
            sector_dict[sec].append({
                "symbol": symbol,
                "name": name,
                "sector": industry,
                "sector_index": sec
            })


# ---------- Generate Python file ----------
with open("stock_universes.py", "w") as f:

    # Index universes
    for idx, stocks in index_dict.items():

        var_name = idx.replace("NIFTY", "NIFTY_") + "_STOCKS"

        f.write(f"{var_name} = [\n")

        for s in stocks:
            f.write(f"    {s},\n")

        f.write("]\n\n")


    # Sector universes
    for sec, stocks in sector_dict.items():

        var_name = sec + "_STOCKS"

        f.write(f"{var_name} = [\n")

        for s in stocks:
            f.write(f"    {s},\n")

        f.write("]\n\n")

print("Universe file generated: stock_universes.py")
import json

with open("comune.geojson", encoding="utf-8") as f:
    data = json.load(f)

tipologie = set()
for feature in data["features"]:
    t = feature.get("properties", {}).get("tipologiaattivita")
    if t and t.strip():
        tipologie.add(t.strip())

for t in sorted(tipologie):
    print(t)
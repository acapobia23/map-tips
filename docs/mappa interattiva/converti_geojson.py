import json
from pyproj import Transformer

# Inizializza il trasformatore da EPSG:3003 a EPSG:4326
transformer = Transformer.from_crs("EPSG:3003", "EPSG:4326", always_xy=True)

# Carica il file sorgente
with open("data-locati.json", encoding="utf-8") as f:
    data = json.load(f)

# Prepara la nuova struttura GeoJSON
out = {
    "type": "FeatureCollection",
    "features": []
}

for feature in data["features"]:
    coords = feature["geometry"]["coordinates"]
    # Trasforma le coordinate (x, y) -> (lon, lat)
    lon, lat = transformer.transform(coords[0], coords[1])
    # Crea una nuova feature con le coordinate convertite
    new_feature = {
        "type": "Feature",
        "id": feature.get("id"),
        "geometry": {
            "type": "Point",
            "coordinates": [lon, lat]
        },
        "properties": feature.get("properties", {})
    }
    out["features"].append(new_feature)

# Salva il nuovo file GeoJSON
with open("comune.geojson", "w", encoding="utf-8") as f:
    json.dump(out, f, ensure_ascii=False, indent=2)

print("Conversione completata! File salvato come comune.geojson")
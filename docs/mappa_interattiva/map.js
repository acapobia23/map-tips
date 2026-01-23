// === HEADER LOGO (hide on scroll, se mai servirà) ===
const header = document.querySelector(".menu-header");
let lastY = 0;
window.addEventListener("scroll", () => {
  const y = window.pageYOffset;
  if (y > lastY && y > header.offsetHeight) {
    header.style.transform = "translateY(-100%)";
  } else {
    header.style.transform = "translateY(0)";
  }
  lastY = y;
});

/* ============================================================
 Velona’s Jungle Interactive Map — FINAL VERSION
 Mode: Premium UX (Smooth zoom, Bounce Selection, Dark Mode)
============================================================ */

let map, routingControl = null;
let activeRing = null;
let lastSelectedMarker = null;
let layers = {};
let basePoint = null;
let activeLayer = null; // <--- nuovo controllo
let ignoreClose = false;

// DOM references
const card = document.getElementById("map-card");
const themeToggle = document.getElementById("theme-toggle");

/* ------------------ INIT ------------------ */
document.addEventListener("DOMContentLoaded", initMap);
// 🔥 Abilita animazione SEMPRE, ad ogni refresh
document.addEventListener("DOMContentLoaded", () => {
  document.body.classList.add("filters-animate");

  // === AUTO-CAROUSEL HINT (mobile only) ===
  setTimeout(() => {
    if (window.innerWidth > 768) return;

    const scrollArea = document.querySelector(".map-controls");
    if (!scrollArea) return;

    scrollArea.scrollTo({ left: scrollArea.scrollWidth, behavior: "smooth" });

    setTimeout(() => {
      scrollArea.scrollTo({ left: 0, behavior: "smooth" });
    }, 1200);

  }, 800);
});

initTheme();

/* ------------------ MAP INIT ------------------ */
async function initMap() {
  map = L.map("map", { zoomControl: false }); // RIMOSSO setView

  const lightTiles = L.tileLayer(
    "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    { maxZoom: 19 }
  ).addTo(map);

  const darkTiles = L.tileLayer(
    "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    { maxZoom: 19 }
  );

  map.tileLayers = { light: lightTiles, dark: darkTiles };

  L.control.zoom({ position: "topright" }).addTo(map);

  // Carica e aggiungi export.geojson locale
  fetch("assets/export.geojson")
    .then((response) => response.json())
    .then((geojson) => {
      const geoLayer = L.geoJSON(geojson, {
        pointToLayer: function(feature, latlng) {
          // Pin personalizzato con immagine
          return L.marker(latlng, {
            icon: L.icon({
              iconUrl: "assets/pin.png",
              iconSize: [32, 32],
              iconAnchor: [16, 41],
              popupAnchor: [0, -36]
            })
          });
        },
        onEachFeature: function (feature, layer) {
          let name = feature.properties?.name || 'Elemento';
          let id = feature.properties?.['@id'] || feature.id || '';
          let tags = '';
          if (feature.properties) {
            tags = '<ul style="margin:0;padding-left:18px;">';
            for (const [k, v] of Object.entries(feature.properties)) {
              if (k !== '@id' && k !== 'name') {
                tags += `<li><strong>${k}</strong>: ${v}</li>`;
              }
            }
            tags += '</ul>';
          }
          // Estrai coordinate
          let lat = null, lng = null;
          if (feature.geometry && feature.geometry.type === 'Point' && Array.isArray(feature.geometry.coordinates)) {
            lng = feature.geometry.coordinates[0];
            lat = feature.geometry.coordinates[1];
          }
          let mapsLink = '';
          if (lat && lng) {
            mapsLink = `<a href="https://www.google.com/maps?q=${lat},${lng}" target="_blank" rel="noopener" style="display:inline-block;margin-top:8px;">apri coordinate su maps</a>`;
          }
          layer.bindPopup(
            `<strong>${name}</strong><br><small>${id}</small><br>${tags}${mapsLink}`
          );
        },
        style: function(feature) {
          // Solo per poligoni/linee
          return { color: '#3bd2c9', weight: 2, fillOpacity: 0.1 };
        }
      }).addTo(map);

      // === GESTIONE POLIGONO UNESCO ===
      // Cerca la feature del poligono UNESCO
      const unescoFeature = geojson.features.find(f => f.geometry && f.geometry.type === 'Polygon' && f.properties && f.properties.name && f.properties.name.toLowerCase().includes('unesco'));
      if (unescoFeature) {
        const unescoLayer = L.geoJSON(unescoFeature, {
          style: { color: '#e67e22', weight: 3, fillOpacity: 0.18, dashArray: '6 4' }
        });
        layers['unesco'] = unescoLayer;
      }

      // Calcola bounds e adatta la vista SOLO dopo aver caricato i dati
      const bounds = geoLayer.getBounds();
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [60, 60], animate: false });
      } else {
        map.setView([43.7769, 11.2387], 14); // fallback
      }
    });

  setupFilters();
  setupMapCloseLogic();
  applyThemeMode();
}

/* ------------------ SELECT MARKER ------------------ */
function onMarkerSelect(marker) {
  ignoreClose = true;
  setTimeout(() => (ignoreClose = false), 250);

  if (lastSelectedMarker) lastSelectedMarker._icon.classList.remove("bounce");
  marker._icon.classList.add("bounce");
  lastSelectedMarker = marker;

  showRoute(marker.place.latlng);
  showRing(marker.place.latlng);

  map.flyTo(marker.place.latlng, Math.max(map.getZoom(), 17), { animate: true, duration: 0.75 });

  showCard(marker.place);
}

/* ------------------ ROUTE ------------------ */
function showRoute(latlng) {
  if (!basePoint) return;
  const basePos = basePoint.getLayers()[0].getLatLng();
  if (routingControl) map.removeControl(routingControl);

  routingControl = L.Routing.control({
    waypoints: [basePos, latlng],
    router: L.Routing.osrmv1({ serviceUrl: "https://router.project-osrm.org/route/v1", profile: "foot" }),
    show: false,
    addWaypoints: false,
    draggableWaypoints: false,
    lineOptions: {
      styles: [
        { color: "rgba(59, 210, 201, 1", weight: 5, opacity: 0.9 },
        { color: "#ffffff", weight: 2, opacity: 0.9 }
      ]
    },
    createMarker: () => null
  }).addTo(map);
}

/* ------------------ RING ------------------ */
function showRing(latlng) {
  // Rimuovi quello precedente
  if (activeRing) map.removeLayer(activeRing);

  // Nuovo marker stile fisso (non si deforma durante zoom)
  activeRing = L.marker(latlng, {
    icon: L.divIcon({
      className: "fixed-ring",
      iconSize: [54, 54], // dimensione fissa (puoi cambiarla)
    }),
    interactive: false // non cliccabile
  }).addTo(map);
}

/* ------------------ CARD ------------------ */
function showCard(place) {
  card.innerHTML = `
    <div class="map-card-inner">
      <div class="map-card-header">
        <img src="${place.iconUrl}" class="map-card-icon" />
        <div>
          <span class="map-card-category">${formatCategory(place.category)}</span>
          <h3 class="map-card-title">${place.name}</h3>
        </div>
      </div>
      <div class="map-card-scroll">
        <p class="map-card-desc">${place.description}</p>
      </div>
      <div class="map-card-btn-row">
        <a class="map-card-btn" target="_blank"
          href="https://www.google.com/maps/dir/?api=1&origin=Velona's Jungle,Florence&destination=${encodeURIComponent(place.name + ', Florence')}">
          Open in Google Maps
        </a>
        <a class="map-card-btn secondary-btn" href="../../boxes/mobility/mobility.html">
          How to Get Around
        </a>
      </div>
    </div>
  `;
  card.classList.add("visible");
}

/* ------------------ MAP CLICK TO CLOSE ------------------ */
function setupMapCloseLogic() {
  map.on("click", () => {
    if (!ignoreClose) hideCard();
  });
}

function hideCard() {
  card.classList.remove("visible");
  if (routingControl) { map.removeControl(routingControl); routingControl = null; }
  if (activeRing) { map.removeLayer(activeRing); activeRing = null; }
  if (lastSelectedMarker) { lastSelectedMarker._icon.classList.remove("bounce"); lastSelectedMarker = null; }
}

/* ------------------ MARKER RESET (single active layer, stable) ------------------ */

function resetSelectionState() {
  // Rimuove routing
  if (routingControl) {
    map.removeControl(routingControl);
    routingControl = null;
  }

  // Rimuove cerchio attivo
  if (activeRing) {
    map.removeLayer(activeRing);
    activeRing = null;
  }

  // Rimuove animazione e resetta marker selezionato
  if (lastSelectedMarker) {
    if (lastSelectedMarker._icon) {
      lastSelectedMarker._icon.classList.remove("bounce");
    }
    lastSelectedMarker = null;
  }

  // Nasconde card se aperta
  card.classList.remove("visible");
}

/* ------------------ FILTERS (single active layer, stable) ------------------ */
function setupFilters() {
  document.querySelectorAll(".map-filter-btn").forEach((btn) => {
    btn.addEventListener("click", () => {

      const selected = btn.dataset.layer;
      const layer = layers[selected];

      // Caso: layer attivo → spegni e reset
      if (activeLayer === selected) {

        resetSelectionState();

        map.removeLayer(layer);
        btn.classList.remove("active");

        activeLayer = null;

        // Centro sul punto base
        requestAnimationFrame(() => {
          map.flyTo([43.7769, 11.2387], 14);
        });

        return;
      }

      // Cambio layer → prima reset totale
      if (activeLayer) {
        resetSelectionState();

        map.removeLayer(layers[activeLayer]);
        document.querySelector(`[data-layer="${activeLayer}"]`)?.classList.remove("active");
      }

      // Attivo nuovo layer
      map.addLayer(layer);
      btn.classList.add("active");
      activeLayer = selected;

      // Centro dopo che i marker sono montati
      setTimeout(() => adjustView(selected), 50);
    });
  });
}

/* ------------------ AUTO VIEW ------------------ */
function adjustView(layerName) {
  const layer = layers[layerName];
  if (!layer) return;

  // Se layer UNESCO, usa bounds del poligono
  if (layerName === 'unesco') {
    const bounds = layer.getBounds();
    if (bounds.isValid()) {
      map.flyToBounds(bounds, { padding: [60, 60], animate: true });
    }
    return;
  }

  const bounds = L.latLngBounds([]);
  layer.eachLayer(marker => {
    if (marker.getLatLng) bounds.extend(marker.getLatLng());
  });
  if (bounds.isValid()) {
    map.flyToBounds(bounds, { padding: [60, 60], animate: true });
  }
}

/* ------------------ THEME ------------------ */
function initTheme() {
  if (localStorage.getItem("theme") === "dark") document.body.classList.add("dark-mode");
}

function applyThemeMode() {
  if (!map || !map.tileLayers) return;

  const mode = document.body.classList.contains("dark-mode") ? "dark" : "light";

  if (map.tileLayers.light) map.removeLayer(map.tileLayers.light);
  if (map.tileLayers.dark) map.removeLayer(map.tileLayers.dark);

  mode === "dark" ? map.tileLayers.dark.addTo(map) : map.tileLayers.light.addTo(map);
}

themeToggle?.addEventListener("click", () => {
  document.body.classList.toggle("dark-mode");
  localStorage.setItem("theme", document.body.classList.contains("dark-mode") ? "dark" : "light");
  applyThemeMode();
});





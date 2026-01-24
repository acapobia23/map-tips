/**
 * Nuovo Logic.js - Visualizzazione semplice di tutti i punti GeoJSON con filtro categorie
 */

let map;
let pinLayer;
let allData = [];
let isDetailCardVisible = false;
let currentCategory = 'restaurant';
let unescoLayer = null;
let unescoBounds = null;

async function initApp() {
    // Inizializzazione Mappa
    map = L.map('map', {
        zoomControl: false,
        center: [43.77, 11.25],
        zoom: 14,
        maxZoom: 21
    });

    // === RIGHELLO DINAMICO ===
    const scaleControl = document.createElement('div');
    scaleControl.id = 'custom-scale-control';
    scaleControl.innerHTML = `
      <div class="scale-bar-container">
        <span class="scale-label"></span>
        <div class="scale-bar-row">
          <span class="scale-bar"></span>
          <span class="scale-icon">🚶‍♂️</span>
        </div>
      </div>`;
    document.getElementById('map-container').appendChild(scaleControl);

    function updateScaleBar() {
        // Lunghezza in pixel del righello
        const barPx = 90;
        // Prendi il centro della mappa
        const center = map.getCenter();
        // Calcola la distanza in metri tra due punti separati da barPx orizzontali
        const p1 = map.containerPointToLatLng([map.getSize().x/2 - barPx/2, map.getSize().y/2]);
        const p2 = map.containerPointToLatLng([map.getSize().x/2 + barPx/2, map.getSize().y/2]);
        const meters = map.distance(p1, p2);
        // Conversione: 5 km/h = 83.33 m/min
        const min = meters / 83.33;
        let label;
        if (min < 1) {
            const sec = Math.round(min * 60);
            label = `${sec} sec`;
        } else if (min < 60) {
            label = `${Math.round(min)} min`;
        } else {
            const hours = Math.floor(min / 60);
            const mins = Math.round(min % 60);
            label = mins > 0 ? `${hours} h ${mins} min` : `${hours} h`;
        }
        // Aggiorna DOM
        scaleControl.querySelector('.scale-bar').style.display = 'inline-block';
        scaleControl.querySelector('.scale-bar').style.width = barPx + 'px';
        scaleControl.querySelector('.scale-bar').style.height = '3px';
        scaleControl.querySelector('.scale-bar').style.background = '#111';
        scaleControl.querySelector('.scale-bar').style.borderRadius = '2px';
        scaleControl.querySelector('.scale-bar').style.margin = '0 4px';
        scaleControl.querySelector('.scale-label').innerHTML = label;
    }
    map.on('zoomend moveend', updateScaleBar);
    setTimeout(updateScaleBar, 600);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap',
        maxZoom: 21,
        maxNativeZoom: 19,
    }).addTo(map);

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Caricamento dati GeoJSON
    try {
        const data = await GeoJSONParser.fetchData('export.geojson');
        if (data && data.features && data.features.length > 0) {
            allData = data.features;
        } else {
            allData = [];
        }
        // === GESTIONE POLIGONO UNESCO ===
        const unescoFeature = data.features.find(f => f.geometry && f.geometry.type === 'Polygon' && f.properties && f.properties.name && f.properties.name.toLowerCase().includes('unesco'));
        if (unescoFeature) {
            unescoLayer = L.geoJSON(unescoFeature, {
                style: { color: '#3bd2c9', weight: 3, fillOpacity: 0.18, dashArray: '6 4' },
                interactive: false
            }).addTo(map);
            unescoBounds = unescoLayer.getBounds();
        }
    } catch (err) {
        allData = [];
    }

    // Inizializza sidebar e callback filtro
    if (typeof SidebarManager !== 'undefined') {
        SidebarManager.init((cat) => {
            currentCategory = cat;
            applyCategoryFilter();
        });
    }
    applyCategoryFilter();
    setTimeout(() => map.invalidateSize(), 500);
} // chiusura corretta di initApp

function applyCategoryFilter() {
    if (unescoLayer && !map.hasLayer(unescoLayer)) map.addLayer(unescoLayer); // sempre visibile
    if (currentCategory === 'unesco') {
        if (unescoBounds && unescoBounds.isValid()) {
            map.fitBounds(unescoBounds, { padding: [50, 50], animate: true });
        }
        // Mostra tutti i marker che ricadono dentro il poligono UNESCO
        const pinsInUnesco = allData.filter(f => {
            if (f.geometry && f.geometry.type === 'Point') {
                const lat = f.geometry.coordinates[1];
                const lng = f.geometry.coordinates[0];
                return unescoBounds && unescoBounds.contains([lat, lng]);
            }
            return false;
        });
        renderMarkers(pinsInUnesco);
        return;
    }
    let filtered;
    if (currentCategory === 'other') {
        filtered = allData.filter(f => {
            const a = f.properties?.amenity;
            return a !== 'restaurant' && a !== 'cafe' && a !== 'nightclub';
        });
    } else {
        filtered = allData.filter(f => f.properties?.amenity === currentCategory);
    }
    renderMarkers(filtered);
}

function renderMarkers(features) {
    if (pinLayer) map.removeLayer(pinLayer);
    pinLayer = L.geoJSON({ type: "FeatureCollection", features }, {
        pointToLayer: (feature, latlng) => {
            let iconHtml = '📍';
            const a = feature.properties?.amenity;
            if (a === 'restaurant') iconHtml = '🍝';
            else if (a === 'cafe') iconHtml = '☕';
            else if (a === 'nightclub') iconHtml = '🎶';
            const icon = L.divIcon({
                className: 'custom-pin-container',
                html: `<div class="custom-pin">${iconHtml}</div>`,
                iconSize: [32, 40],
                iconAnchor: [16, 40]
            });
            return L.marker(latlng, { icon });
        },
        onEachFeature: (feature, layer) => {
            layer.on('click', (e) => {
                L.DomEvent.stopPropagation(e);
                showDetailCard(feature);
            });
        },
        style: function(feature) {
            return { color: '#3bd2c9', weight: 2, fillOpacity: 0.1 };
        }
    }).addTo(map);

    if (features.length > 0 && !isDetailCardVisible) {
        map.fitBounds(pinLayer.getBounds(), { padding: [50, 50], animate: true });
    }
}

function showDetailCard(feature) {
    const card = document.getElementById('map-card');
    const p = feature.properties || {};
    let lat = null, lng = null;
    if (feature.geometry && feature.geometry.type === 'Point' && Array.isArray(feature.geometry.coordinates)) {
        lng = feature.geometry.coordinates[0];
        lat = feature.geometry.coordinates[1];
    }
    let mapsLink = '';
    if (lat && lng) {
        mapsLink = `<a href="https://www.google.com/maps?q=${lat},${lng}" target="_blank" rel="noopener" style="display:inline-block;margin-top:8px;">apri coordinate su maps</a>`;
    }
    card.innerHTML = `
        <div class="map-card-inner">
            <button class="close-btn">&times;</button>
            <h2 style="font-size:1.3rem; margin-bottom:10px;">${p.name || 'Punto di Interesse'}</h2>
            <div style="max-height:150px; overflow-y:auto; font-size:0.85rem; color:#666;">
                ${Object.entries(p).map(([k,v]) => k !== 'name' ? `<p><strong>${k}:</strong> ${v}</p>` : '').join('')}
                ${mapsLink}
            </div>
        </div>
    `;
    card.classList.add('visible');
    isDetailCardVisible = true;
    card.querySelector('.close-btn').onclick = () => {
        card.classList.remove('visible');
        isDetailCardVisible = false;
    };
}

window.addEventListener('load', initApp);

// ------------------ SEARCH LOGIC ------------------
const searchInput = document.getElementById('map-search');
if (searchInput) {
    searchInput.addEventListener('input', function() {
        const query = this.value.trim().toLowerCase();
        if (!query) {
            applyCategoryFilter();
            return;
        }
        // Cerca tra tutti i dati filtrati per categoria
        let filtered = allData;
        if (currentCategory && currentCategory !== 'unesco') {
            if (currentCategory === 'other') {
                filtered = allData.filter(f => {
                    const a = f.properties?.amenity;
                    return a !== 'restaurant' && a !== 'cafe' && a !== 'nightclub';
                });
            } else {
                filtered = allData.filter(f => f.properties?.amenity === currentCategory);
            }
        } else if (currentCategory === 'unesco' && unescoBounds) {
            filtered = allData.filter(f => {
                if (f.geometry && f.geometry.type === 'Point') {
                    const lat = f.geometry.coordinates[1];
                    const lng = f.geometry.coordinates[0];
                    return unescoBounds.contains([lat, lng]);
                }
                return false;
            });
        }
        // Filtra per testo
        const results = filtered.filter(f => {
            const props = f.properties || {};
            return (
                (props.name && props.name.toLowerCase().includes(query)) ||
                (props.description && props.description.toLowerCase().includes(query)) ||
                (props.address && props.address.toLowerCase().includes(query)) ||
                (props['addr:street'] && props['addr:street'].toLowerCase().includes(query))
            );
        });
        renderMarkers(results);
    });
}

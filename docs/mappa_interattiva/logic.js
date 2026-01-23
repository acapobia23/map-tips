/**
 * Logic.js - Core Map Engine
 */

let map;
let pinLayer;
let allData = [];
let comuneData = [];
let currentFilter = { category: '', query: '' };
let isDetailCardVisible = false;

// Mock data potenziato per testare le categorie
const MOCK_FEATURES = [
    { type: "Feature", properties: { name: "Grand Hotel Firenze", tourism: "hotel" }, geometry: { type: "Point", coordinates: [11.252, 43.775] } },
    { type: "Feature", properties: { name: "Uffizi Gallery", tourism: "museum" }, geometry: { type: "Point", coordinates: [11.255, 43.768] } },
    { type: "Feature", properties: { name: "Statua di Dante", tourism: "artwork" }, geometry: { type: "Point", coordinates: [11.258, 43.770] } },
    { type: "Feature", properties: { name: "Punto Panoramico Arno", tourism: "viewpoint" }, geometry: { type: "Point", coordinates: [11.245, 43.765] } },
    { type: "Feature", properties: { name: "Ostello Bello", tourism: "hostel" }, geometry: { type: "Point", coordinates: [11.248, 43.778] } }
];

async function initApp() {
    // 1. Inizializzazione Mappa
    map = L.map('map', {
        zoomControl: false,
        center: [43.77, 11.25],
        zoom: 14,
        maxZoom: 21
    });

    // Basemap chiara stile GeoExplorer
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap',
        maxZoom: 21,
        maxNativeZoom: 19,
    }).addTo(map);

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // 2. Caricamento Dati
    try {
        const [data, comune] = await Promise.all([
            GeoJSONParser.fetchData('export.geojson'),
            GeoJSONParser.fetchData('comune.geojson')
        ]);
        if (data && data.features && data.features.length > 0) {
            allData = data.features.map(f => ({
                ...f,
                hasWebsite: f.website || f.properties?.website || f.properties?.url || f.properties?.contact?.website
            }));
        } else {
            allData = MOCK_FEATURES;
        }
        if (comune && comune.features && comune.features.length > 0) {
            comuneData = comune.features.map(f => ({
                ...f,
                isComune: true // flag per marker arancioni
            }));
        } else {
            comuneData = [];
        }
    } catch (err) {
        allData = MOCK_FEATURES;
        comuneData = [];
    }

    // 3. Inizializzazione Sidebar
    SidebarManager.init(allData, (newFilter) => {
        currentFilter = newFilter;
        applyFilters();
    }, comuneData);

    // Rendering iniziale
    applyFilters();
    
    // Fix resize mappa
    setTimeout(() => map.invalidateSize(), 500);
}

function applyFilters() {
    let filtered = allData;
    let isComune = false;
    const { category, query } = currentFilter;

    // Se nessuna categoria selezionata, non mostrare punti
    if (!category) {
        renderMarkers([], false);
        return;
    }

    // Mostra tutti i punti (export.geojson + comune.geojson)
    if (category === 'all') {
        filtered = allData.concat(comuneData);
    } 
    // Categoria UNESCO sempre attiva
    else if (category === 'unesco') {
        filtered = allData.filter(f => f.properties?.name === 'Centro Storico UNESCO');
    }
    // Gestione categorie del comune
    else if (category && category.startsWith('comune:')) {
        isComune = true;
        const tipo = category.split(':')[1];
        filtered = comuneData.filter(f => {
            // Filtro esatto e case sensitive sulla tipologiaattivita
            const t = f.properties?.tipologiaattivita || f.properties?.tipologia || f.properties?.tipo_attivita || 'Altro';
            return t === tipo;
        });
    } else {
        // Filtro Categoria standard
        if (category === 'haswebsite') {
            filtered = filtered.filter(f => f.hasWebsite);
        } else if (category !== 'all') {
            filtered = filtered.filter(f => {
                const props = f.properties || {};
                return props.tourism === category || props.amenity === category || props.shop === category;
            });
        }
    }

    // Filtro Ricerca Testuale
    if (query && query.trim() !== '') {
        const q = query.toLowerCase().trim();
        filtered = filtered.filter(f => {
            const name = (f.properties?.name || "").toLowerCase();
            return name.includes(q);
        });
    }

    renderMarkers(filtered, isComune);
}

function renderMarkers(features, isComune = false) {
    if (pinLayer) map.removeLayer(pinLayer);

    // Emoji per tipologie del comune
    const comuneEmojis = {
        'ABUSIVI': '🚫',
        'AFFITTACAMERE': '🏠',
        'AGRITURISMO': '🌾',
        'ALBERGHI': '🏨',
        'BED AND BREAKFAST': '🛏️',
        'CASE PER FERIE': '🏡',
        'CAV': '🏢',
        'FATTORIA DIDATTICA': '👩‍🌾',
        'OSTELLO': '🛌',
        'RESIDENCE': '🏬',
        "RESIDENZA D'EPOCA": '🏰',
        'RTA': '🏚️'
    };

    pinLayer = L.geoJSON({ type: "FeatureCollection", features }, {
        pointToLayer: (feature, latlng) => {
            let icon;
            if (isComune || feature.isComune) {
                // Emoji in base alla tipologia
                const tipo = feature.properties?.tipologiaattivita || feature.properties?.tipologia || feature.properties?.tipo_attivita || 'Altro';
                const emoji = comuneEmojis[tipo] || '🟧';
                icon = L.divIcon({
                    className: 'custom-pin-container',
                    html: `<div class="custom-pin pin-comune">${emoji}</div>`,
                    iconSize: [32, 40],
                    iconAnchor: [16, 40]
                });
            } else {
                const symbol = getSymbol(feature.properties);
                icon = L.divIcon({
                    className: 'custom-pin-container',
                    html: `<div class="custom-pin">${symbol}</div>`,
                    iconSize: [32, 40],
                    iconAnchor: [16, 40]
                });
            }
            return L.marker(latlng, { icon });
        },
        onEachFeature: (feature, layer) => {
            layer.on('click', (e) => {
                L.DomEvent.stopPropagation(e);
                showDetailCard(feature);
            });
        },
        style: function(feature) {
            // Solo per poligoni/linee
            return { color: isComune ? 'orange' : '#3bd2c9', weight: 2, fillOpacity: 0.1 };
        }
    }).addTo(map);

    if (features.length > 0 && !isDetailCardVisible) {
        map.fitBounds(pinLayer.getBounds(), { padding: [50, 50], animate: true });
    }
}

function getSymbol(props) {
    const type = props.tourism || props.amenity || props.shop || '';
    // Emoji mapping by category
    if (type.includes('guest_house') || type.includes('affittacamere')) return '🏠'; // Affittacamere
    if (type.includes('attraction')) return '🎡'; // Attrazioni
    if (type.includes('information')) return 'ℹ️'; // Info Turistiche
    if (type.includes('hostel')) return '🛌'; // Ostelli
    if (type.includes('viewpoint')) return '🔭'; // Punti Panoramici
    if (type.includes('apartment')) return '🏙️'; // Appartamenti
    if (type.includes('gallery')) return '🖼️'; // Gallerie
    if (type.includes('hotel')) return '🏨';
    if (type.includes('museum')) return '🏛️';
    if (type.includes('artwork')) return '🎨';
    if (type.includes('bar')) return '🍸';
    if (type.includes('ice_cream')) return '🍦';
    if (type.includes('cafe')) return '☕';
    if (type.includes('restaurant')) return '🍝';
    return '📍';
}

function showDetailCard(feature) {
    const card = document.getElementById('map-card');
    const p = feature.properties || {};
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

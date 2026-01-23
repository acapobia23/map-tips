/**
 * SidebarManager - Logica UI GeoExplorer
 */
const SidebarManager = {
  activeCategory: '',
  onFilterChange: null,
  allFeatures: [],
  expandedGroups: { overpass: false, comune: false },
  comuneFeatures: [],

  // Mappatura icone per le categorie principali
  categoryIcons: {
    'all': '🗺️',
    'unesco': '🏛️',
    'hotel': '🏨',
    'artwork': '🎨',
    'museum': '🏛️',
    'guest_house': '🏠',
    'attraction': '🎡',
    'information': 'ℹ️',
    'hostel': '🛌',
    'viewpoint': '🔭',
    'apartment': '🏙️',
    'gallery': '🖼️',
    'restaurant': '🍝',
    'cafe': '☕',
    'bar': '🍸',
    'ice_cream': '🍦',
    'haswebsite': '🌐'
  },

  // Mappatura nomi leggibili
  categoryNames: {
    'all': 'Tutti i Punti',
    'unesco': 'Centro Storico UNESCO',
    'hotel': 'Hotel',
    'artwork': 'Opere d\'Arte',
    'museum': 'Musei',
    'guest_house': 'Affittacamere',
    'attraction': 'Attrazioni',
    'information': 'Info Turistiche',
    'hostel': 'Ostelli',
    'viewpoint': 'Punti Panoramici',
    'apartment': 'Appartamenti',
    'gallery': 'Gallerie',
    'restaurant': 'Ristoranti',
    'cafe': 'Caffè',
    'bar': 'Bar',
    'ice_cream': 'Gelato',
    'ice cream': 'Gelato',
    'haswebsite': 'Con Sito Web'
  },

  init(features, callback, comune = []) {
    this.allFeatures = features;
    this.onFilterChange = callback;
    comuneFeatures = comune;
    this.renderCategories();
    this.setupSearch();
    this.setupMobileToggle();
  },

  renderCategories() {
    const container = document.getElementById('categories-list');
    const counts = this.calculateCounts();
    container.innerHTML = '';

    // Voci principali sempre visibili
    const mainCats = [
      { id: 'all', label: this.categoryNames['all'], icon: this.categoryIcons['all'], count: counts['all'] },
      { id: 'unesco', label: this.categoryNames['unesco'], icon: this.categoryIcons['unesco'], count: counts['unesco'] || 1 },
      { id: 'haswebsite', label: this.categoryNames['haswebsite'], icon: this.categoryIcons['haswebsite'], count: counts['haswebsite'] }
    ];
    mainCats.forEach(cat => {
      const item = document.createElement('div');
      item.className = `cat-item ${this.activeCategory === cat.id ? 'active' : ''}`;
      item.innerHTML = `
        <div class="cat-icon">${cat.icon || '📍'}</div>
        <div class="cat-name">${cat.label}</div>
        <div class="cat-count">${cat.count}</div>
      `;
      item.onclick = () => {
        this.activeCategory = cat.id;
        this.renderCategories();
        this.onFilterChange({ category: cat.id, query: document.getElementById('map-search').value });
        // Collassa solo per 'all', 'unesco' e 'haswebsite'
        if ((cat.id === 'all' || cat.id === 'unesco' || cat.id === 'haswebsite') && window.innerWidth <= 768) {
          document.getElementById('sidebar').classList.remove('open');
        }
      };
      container.appendChild(item);
    });

    // Gruppo Overpass (categorie attuali)
    const overpassCats = ['restaurant', 'hotel', 'cafe', 'bar', 'artwork', 'museum', 'ice_cream', 'guest_house', 'attraction', 'information', 'hostel', 'viewpoint', 'apartment', 'gallery'];
    const overpassGroup = document.createElement('div');
    overpassGroup.className = 'cat-group';
    overpassGroup.innerHTML = `
      <div class="cat-item group-header" style="font-weight:700;cursor:pointer;display:flex;align-items:center;gap:8px;">
        <span>${this.expandedGroups.overpass ? '▼' : '▶'}</span>
        <span class="cat-icon">🗂️</span>
        <span class="cat-name">Overpass</span>
      </div>
    `;
    overpassGroup.querySelector('.group-header').onclick = (event) => {
      event.preventDefault();
      event.stopPropagation();
      this.expandedGroups.overpass = !this.expandedGroups.overpass;
      this.renderCategories();
    };
    if (this.expandedGroups.overpass) {
      overpassCats.forEach(catId => {
        const count = counts[catId] || 0;
        if (count === 0) return;
        const item = document.createElement('div');
        item.className = `cat-item subcat ${this.activeCategory === catId ? 'active' : ''}`;
        item.style.paddingLeft = '40px';
        item.innerHTML = `
          <div class="cat-icon">${this.categoryIcons[catId] || '📍'}</div>
          <div class="cat-name">${this.categoryNames[catId] || catId}</div>
          <div class="cat-count">${count}</div>
        `;
        item.onclick = () => {
          this.activeCategory = catId;
          this.renderCategories();
          this.onFilterChange({ category: catId, query: document.getElementById('map-search').value });
          // Collassa solo per micro-categorie (non per macro)
          if (window.innerWidth <= 768) {
            setTimeout(() => {
              document.getElementById('sidebar').classList.remove('open');
            }, 120);
          }
        };
        overpassGroup.appendChild(item);
      });
    }
    container.appendChild(overpassGroup);

    // Gruppo Comune (ora con sottocategorie ufficiali)
    const comuneGroup = document.createElement('div');
    comuneGroup.className = 'cat-group';
    comuneGroup.innerHTML = `
      <div class="cat-item group-header" style="font-weight:700;cursor:pointer;display:flex;align-items:center;gap:8px;">
        <span>${this.expandedGroups.comune ? '▼' : '▶'}</span>
        <span class="cat-icon">🏛️</span>
        <span class="cat-name">Comune</span>
      </div>
    `;
    comuneGroup.querySelector('.group-header').onclick = (event) => {
      event.preventDefault();
      event.stopPropagation();
      this.expandedGroups.comune = !this.expandedGroups.comune;
      this.renderCategories();
    };
    if (this.expandedGroups.comune && comuneFeatures.length > 0) {
      // Tipologie ufficiali da mostrare
      const TIPI_COMUNE = [
        'ABUSIVI',
        'AFFITTACAMERE',
        'AGRITURISMO',
        'ALBERGHI',
        'BED AND BREAKFAST',
        'CASE PER FERIE',
        'CAV',
        'FATTORIA DIDATTICA',
        'OSTELLO',
        'RESIDENCE',
        "RESIDENZA D'EPOCA",
        'RTA'
      ];
      // Raggruppa per tipologia
      const tipologie = {};
      comuneFeatures.forEach(f => {
        const tipo = f.properties?.tipologiaattivita || f.properties?.tipologia || f.properties?.tipo_attivita || 'Altro';
        if (!tipologie[tipo]) tipologie[tipo] = [];
        tipologie[tipo].push(f);
      });
      // Mappatura emoji per tipologie del comune
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
      TIPI_COMUNE.forEach(tipo => {
        const arr = tipologie[tipo] || [];
        const emoji = comuneEmojis[tipo] || '🟧';
        const item = document.createElement('div');
        item.className = 'cat-item subcat';
        item.style.paddingLeft = '40px';
        item.innerHTML = `
          <div class="cat-icon" style="color:orange;">${emoji}</div>
          <div class="cat-name">${tipo}</div>
          <div class="cat-count">${arr.length}</div>
        `;
        item.onclick = () => {
          this.activeCategory = `comune:${tipo}`;
          this.renderCategories();
          this.onFilterChange({ category: `comune:${tipo}`, query: document.getElementById('map-search').value });
          // Collassa solo per micro-categorie (non per macro)
          if (window.innerWidth <= 768) {
            setTimeout(() => {
              document.getElementById('sidebar').classList.remove('open');
            }, 120); // delay breve per evitare bug mobile
          }
        };
        comuneGroup.appendChild(item);
      });
    }
    container.appendChild(comuneGroup);
  },

  calculateCounts() {
    // Somma sia i punti di allFeatures che di comuneFeatures
    const counts = { all: this.allFeatures.length + (comuneFeatures ? comuneFeatures.length : 0), haswebsite: 0 };
    this.allFeatures.forEach(f => {
      const type = f.properties?.tourism || f.properties?.amenity || f.properties?.shop;
      if (type) {
        counts[type] = (counts[type] || 0) + 1;
      }
      if (f.hasWebsite) {
        counts.haswebsite++;
      }
      // Conta UNESCO
      if (f.properties?.name === 'Centro Storico UNESCO') {
        counts.unesco = (counts.unesco || 0) + 1;
      }
    });
    // Se vuoi conteggiare anche i punti del comune per altre categorie, aggiungi qui
    return counts;
  },

  setupSearch() {
    const input = document.getElementById('map-search');
    const searchIcon = document.querySelector('.search-icon');
    input.addEventListener('input', (e) => {
      this.onFilterChange({ 
        category: this.activeCategory, 
        query: e.target.value 
      });
    });
    // Click sulla lente: filtra su tutti e chiudi sidebar su mobile
    if (searchIcon) {
      searchIcon.onclick = () => {
        this.activeCategory = 'all';
        this.renderCategories();
        this.onFilterChange({ category: 'all', query: input.value });
        if (window.innerWidth <= 768) {
          document.getElementById('sidebar').classList.remove('open');
        }
      };
    }
  },

  setupMobileToggle() {
    const btn = document.getElementById('sidebar-toggle');
    const sidebar = document.getElementById('sidebar');
    btn.onclick = () => sidebar.classList.toggle('open');
  }
};

// Se ci sono riferimenti a export.geojson, cupola.png, aggiornarli in assets/export.geojson, assets/cupola.png

// Chiusura sidebar cliccando fuori su mobile
if (typeof window !== 'undefined') {
  document.addEventListener('click', function(e) {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;
    if (window.innerWidth > 768) return;
    if (!sidebar.classList.contains('open')) return;
    if (!sidebar.contains(e.target) && !e.target.closest('#sidebar-toggle')) {
      sidebar.classList.remove('open');
    }
  });
}

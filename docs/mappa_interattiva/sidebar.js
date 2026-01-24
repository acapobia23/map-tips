/**
 * Sidebar con selezione categorie principali
 */
const SidebarManager = {
    categories: [
        { id: 'unesco', label: 'Area UNESCO', icon: '🏛️' },
        { id: 'restaurant', label: 'Ristoranti', icon: '🍝' },
        { id: 'cafe', label: 'Caffè', icon: '☕' },
        { id: 'nightclub', label: 'Nightclub', icon: '🎶' },
        { id: 'other', label: 'Altro', icon: '📍' }
    ],
    activeCategory: 'restaurant',
    onCategoryChange: null,
    init(callback) {
        this.onCategoryChange = callback;
        this.render();
    },
    render() {
        const list = document.getElementById('categories-list');
        if (!list) return;
        list.innerHTML = '';
        this.categories.forEach(cat => {
            const item = document.createElement('div');
            item.className = `cat-item${this.activeCategory === cat.id ? ' active' : ''}`;
            item.innerHTML = `<span class="cat-icon">${cat.icon}</span> <span>${cat.label}</span>`;
            item.onclick = () => {
                this.activeCategory = cat.id;
                this.render();
                if (this.onCategoryChange) this.onCategoryChange(cat.id);
                // Chiudi sidebar su mobile dopo selezione
                closeSidebar();
            };
            list.appendChild(item);
        });
    }
};

// --- LOGICA COLLASSO/TOGGLE SIDEBAR MOBILE ---
function openSidebar() {
    document.getElementById('sidebar')?.classList.add('open');
    document.body.classList.add('sidebar-open');
}
function closeSidebar() {
    document.getElementById('sidebar')?.classList.remove('open');
    document.body.classList.remove('sidebar-open');
}
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar?.classList.contains('open')) {
        closeSidebar();
    } else {
        openSidebar();
    }
}

// Bottone toggle
const sidebarToggleBtn = document.getElementById('sidebar-toggle');
if (sidebarToggleBtn) {
    sidebarToggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleSidebar();
    });
}

// Chiudi sidebar cliccando fuori (solo mobile)
document.addEventListener('click', function(e) {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;
    if (window.innerWidth > 768) return; // solo mobile
    if (sidebar.classList.contains('open')) {
        if (!sidebar.contains(e.target) && e.target !== sidebarToggleBtn) {
            closeSidebar();
        }
    }
});

//aggiungi qui le voci della sidebar della mappa interattiva
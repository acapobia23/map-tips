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
            };
            list.appendChild(item);
        });
    }
};

//aggiungi qui le voci della sidebar della mappa interattiva
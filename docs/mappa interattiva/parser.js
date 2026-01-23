/**
 * Parser dedicato per file GeoJSON generici
 */
const GeoJSONParser = {
    /**
     * Carica e valida un file GeoJSON
     * @param {string} filename - Il nome del file GeoJSON da caricare
     * @returns {Promise<Object>} I dati GeoJSON
     */
    async fetchData(filename = 'export.geojson') {
        try {
            console.log(`Inizio fetch di ${filename}...`);
            const response = await fetch(filename);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            // Validazione minima della struttura GeoJSON
            if (!data || data.type !== 'FeatureCollection' || !Array.isArray(data.features)) {
                console.warn("Struttura GeoJSON non standard o vuota.");
            }
            
            return data;
        } catch (error) {
            console.error("Errore nel parser durante il caricamento:", error);
            return null;
        }
    },

    /**
     * Estrae informazioni utili da una singola feature
     */
    parseFeature(feature) {
        return {
            id: feature.id || feature.properties?.['@id'] || 'N/A',
            name: feature.properties?.name || 'Senza Nome',
            properties: feature.properties || {},
            coordinates: feature.geometry?.coordinates || [],
            website: feature.properties?.website || feature.properties?.url || feature.properties?.contact?.website || null,
            hasWebsite: !!(feature.properties?.website || feature.properties?.url || feature.properties?.contact?.website)
        };
    }
};

/*
 * Task2 / US4 Add-on: Event Search
 * - Does not replace existing script.js.
 * - Adds event name items into the same search data created by task1-room-search-addon.js.
 */
(function () {
    'use strict';

    const EVENT_META_URL = 'event_metadata.json';

    function normalizeNodeId(value) {
        const raw = String(value || '').trim();
        if (!raw) return raw;
        if (raw.startsWith('LC3_')) return raw;
        if (raw.startsWith('hallway')) return `LC3_F2_${raw}`;
        if (/^2\d{2}$/.test(raw) || raw.startsWith('F2_')) return `LC3_F2_${raw.replace(/^F2_/, '')}`;
        return `LC3_${raw}`;
    }

    async function loadEventSearch() {
        const addon = window.__cs232SearchAddon;
        if (!addon || !addon.addItems || !addon.findNode) return;

        try {
            const response = await fetch(EVENT_META_URL);
            if (!response.ok) throw new Error(`Cannot load ${EVENT_META_URL}`);
            const metadata = await response.json();
            const items = metadata.map(row => {
                const node = addon.findNode(normalizeNodeId(row.node_id)) || addon.findNode(row.node_id);
                if (!node) return null;
                return {
                    category: 'event',
                    SearchTerm: `${row.name} ${row.event_name || ''}`.trim(),
                    RoomNumber: node.name || row.node_id,
                    RoomName: `Event • ${row.name}`,
                    node_id: node.id,
                    X: Number(node.x),
                    Y: Number(node.y),
                    floor: node.floor
                };
            });
            addon.addItems(items);
            document.dispatchEvent(new CustomEvent('cs232:event-search-ready'));
        } catch (error) {
            console.error('[Task2/US4] Event search add-on failed:', error);
        }
    }

    if (window.__cs232SearchAddon && window.__cs232SearchAddon.items) {
        loadEventSearch();
    } else {
        document.addEventListener('cs232:room-search-ready', loadEventSearch, { once: true });
    }
})();

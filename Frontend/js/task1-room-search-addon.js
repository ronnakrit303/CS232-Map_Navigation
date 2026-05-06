/*
 * Task4 / US1 Add-on: Room Search UI
 * - Does not replace the existing script.js.
 * - Adds data and helper behavior for room search, suggestions, FROM/TO, and Navigate.
 * - Requires Frontend/graph.json and this file to be loaded after script.js.
 */
(function () {
    'use strict';

    const GRAPH_URL = 'graph.json';
    const state = {
        graph: null,
        nodes: [],
        searchItems: []
    };

    window.__cs232SearchAddon = window.__cs232SearchAddon || {};
    window.__cs232SearchAddon.state = state;

    function normalize(text) {
        return String(text || '').trim().toLowerCase();
    }

    function displayNodeName(node) {
        if (!node) return '';
        return node.name || String(node.id || '').replace(/^LC3_/, '').replace(/^F2_/, '');
    }

    function itemFromNode(node, prefixText) {
        const room = displayNodeName(node);
        const label = node.label || node.type || 'Location';
        const floor = node.floor ? `ชั้น ${node.floor}` : '';
        const title = prefixText ? `${prefixText} ${room}` : room;
        return {
            category: 'room',
            SearchTerm: `${title} ${label} ${floor}`.trim(),
            RoomNumber: room,
            RoomName: `${label}${floor ? ' • ' + floor : ''}`,
            node_id: node.id,
            X: Number(node.x),
            Y: Number(node.y),
            floor: node.floor
        };
    }

    function rebuildMockData() {
        window.mockData = state.searchItems;
        window.__cs232SearchAddon.items = state.searchItems;
    }

    function findNodeByIdOrName(value) {
        const query = normalize(value).replace(/^lc3_/, '').replace(/^f2_/, '');
        if (!query) return null;

        return state.nodes.find(node => normalize(node.id) === normalize(value)) ||
            state.nodes.find(node => normalize(node.name) === query) ||
            state.nodes.find(node => normalize(node.id).endsWith('_' + query)) ||
            state.nodes.find(node => normalize(node.id).endsWith(query)) ||
            null;
    }

    function searchItems(query, limit = 8) {
        const q = normalize(query);
        if (!q) return [];
        return state.searchItems
            .filter(item => normalize(`${item.SearchTerm} ${item.RoomNumber} ${item.RoomName}`).includes(q))
            .slice(0, limit);
    }

    function renderSuggestionList(input, listElement) {
        if (!input || !listElement) return;
        const results = searchItems(input.value, 7);
        if (!input.value.trim() || results.length === 0) {
            listElement.innerHTML = '';
            listElement.classList.remove('show');
            return;
        }

        listElement.innerHTML = results.map(item => `
            <button type="button" class="addon-suggestion-item" data-node-id="${item.node_id}" data-room="${item.RoomNumber}">
                <strong>${item.RoomNumber}</strong>
                <span>${item.RoomName}</span>
            </button>
        `).join('');

        listElement.classList.add('show');
        listElement.querySelectorAll('.addon-suggestion-item').forEach(button => {
            button.addEventListener('click', () => {
                input.value = button.dataset.room;
                input.dataset.nodeId = button.dataset.nodeId;
                listElement.innerHTML = '';
                listElement.classList.remove('show');
            });
        });
    }

    function attachFromToAutocomplete() {
        const startInput = document.getElementById('start-query');
        const goalInput = document.getElementById('goal-query');
        const startList = document.getElementById('start-suggestions');
        const goalList = document.getElementById('goal-suggestions');

        [
            [startInput, startList],
            [goalInput, goalList]
        ].forEach(([input, list]) => {
            if (!input || !list || input.dataset.roomAddonReady === 'true') return;
            input.dataset.roomAddonReady = 'true';
            input.addEventListener('input', () => {
                input.dataset.nodeId = '';
                renderSuggestionList(input, list);
            });
            input.addEventListener('focus', () => renderSuggestionList(input, list));
        });
    }

    function attachPanelToggleIfMissing() {
        const overlay = document.querySelector('.search-overlay');
        const inputGroup = document.querySelector('.search-overlay .input-group');
        if (!overlay || !inputGroup || document.getElementById('addonSearchPanelToggle')) return;

        const toggle = document.createElement('button');
        toggle.type = 'button';
        toggle.id = 'addonSearchPanelToggle';
        toggle.className = 'addon-search-toggle';
        toggle.setAttribute('aria-label', 'Toggle navigation panel');
        toggle.innerHTML = '<i class="fas fa-chevron-up"></i>';

        const searchBox = overlay.querySelector(':scope > .search-box');
        if (searchBox) searchBox.appendChild(toggle);
        else overlay.insertBefore(toggle, inputGroup);

        toggle.addEventListener('click', () => {
            inputGroup.classList.toggle('addon-collapsed');
            const icon = toggle.querySelector('i');
            if (icon) {
                icon.className = inputGroup.classList.contains('addon-collapsed')
                    ? 'fas fa-chevron-down'
                    : 'fas fa-chevron-up';
            }
        });
    }

    function resolveInputNode(input) {
        if (!input) return null;
        if (input.dataset.nodeId) return findNodeByIdOrName(input.dataset.nodeId);
        const firstMatch = searchItems(input.value, 1)[0];
        if (firstMatch) return findNodeByIdOrName(firstMatch.node_id);
        return findNodeByIdOrName(input.value);
    }

    window.navigateUser = function navigateUser(event) {
        if (event) event.preventDefault();
        const goalInput = document.getElementById('goal-query');
        const targetNode = resolveInputNode(goalInput);

        if (!targetNode) {
            alert('ไม่พบปลายทาง กรุณาเลือกห้องจากรายการแนะนำ');
            return;
        }

        // Reuse the existing initMap behavior in script.js by opening the page with loc_id.
        const url = new URL(window.location.href);
        url.searchParams.set('loc_id', targetNode.id);
        window.location.href = url.toString();
    };

    window.__cs232SearchAddon.findNode = findNodeByIdOrName;
    window.__cs232SearchAddon.addItems = function addItems(items) {
        state.searchItems.push(...items.filter(Boolean));
        rebuildMockData();
    };
    window.__cs232SearchAddon.makeItemFromNode = itemFromNode;

    async function initRoomSearchAddon() {
        try {
            const response = await fetch(GRAPH_URL);
            if (!response.ok) throw new Error(`Cannot load ${GRAPH_URL}`);
            state.graph = await response.json();
            state.nodes = Array.isArray(state.graph.nodes) ? state.graph.nodes : [];
            state.searchItems = state.nodes
                .filter(node => node && node.x !== undefined && node.y !== undefined)
                .map(node => itemFromNode(node));
            rebuildMockData();
            attachFromToAutocomplete();
            attachPanelToggleIfMissing();
            document.dispatchEvent(new CustomEvent('cs232:room-search-ready'));
        } catch (error) {
            console.error('[Task4/US1] Room search add-on failed:', error);
            window.mockData = window.mockData || [];
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initRoomSearchAddon);
    } else {
        initRoomSearchAddon();
    }
})();

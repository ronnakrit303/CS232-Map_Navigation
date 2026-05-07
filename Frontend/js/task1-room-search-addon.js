/*
 * Task4 / US1 Add-on: Room Search UI
 * Adds room search, FROM/TO autocomplete, backend pathfinding, and directions.
 */
(function () {
    'use strict';

    const GRAPH_URL = 'graph.json';
    const API_BASE_URL = String(window.CS232_API_BASE || '').trim();
    const state = {
        graph: null,
        nodes: [],
        searchItems: [],
        currentRoutePath: []
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
            RoomName: `${label}${floor ? ' · ' + floor : ''}`,
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

    function apiUrl(path) {
        if (!API_BASE_URL) {
            throw new Error('ยังไม่ได้ตั้งค่า backend API URL ใน Frontend/config.js');
        }
        return `${API_BASE_URL.replace(/\/$/, '')}${path}`;
    }

    async function fetchJson(url, options) {
        const response = await fetch(url, options);
        const data = await response.json();
        if (!response.ok || data.status === 'fail') {
            throw new Error(data.error || data.message || 'Navigation request failed');
        }
        return data;
    }

    function setNavigateButtonLoading(isLoading) {
        const button = document.getElementById('btn-navigate');
        if (!button) return;
        button.disabled = isLoading;
        button.textContent = isLoading ? 'Finding route...' : 'Navigate';
    }

    function nodeTitle(nodeId) {
        const node = findNodeByIdOrName(nodeId);
        return node ? displayNodeName(node) : nodeId;
    }

    function activeFloor() {
        const activeButton = document.querySelector('.floor-btn.active');
        return activeButton ? String(activeButton.getAttribute('data-floor')) : '1';
    }

    function clearRouteOverlay() {
        document.querySelectorAll('.route-path-line, .route-node-marker').forEach(element => element.remove());
    }

    function drawRouteOnCurrentFloor(path) {
        clearRouteOverlay();
        const mapWrapper = document.getElementById('mapWrapper');
        const mapImage = document.getElementById('mapImage');
        if (!mapWrapper || !mapImage || !Array.isArray(path) || path.length < 2) return;

        const floor = activeFloor();
        const routeNodes = path
            .map(nodeId => findNodeByIdOrName(nodeId))
            .filter(node => node && String(node.floor) === floor && Number.isFinite(Number(node.x)) && Number.isFinite(Number(node.y)));

        if (routeNodes.length < 2) return;

        const width = mapImage.naturalWidth || mapImage.width || 1200;
        const height = mapImage.naturalHeight || mapImage.height || 800;
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.classList.add('route-path-line');
        svg.setAttribute('width', width);
        svg.setAttribute('height', height);
        svg.setAttribute('viewBox', `0 0 ${width} ${height}`);

        const polyline = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
        polyline.setAttribute('points', routeNodes.map(node => `${node.x},${node.y}`).join(' '));
        polyline.setAttribute('fill', 'none');
        polyline.setAttribute('stroke', '#0066cc');
        polyline.setAttribute('stroke-width', '6');
        polyline.setAttribute('stroke-linecap', 'round');
        polyline.setAttribute('stroke-linejoin', 'round');
        svg.appendChild(polyline);
        mapWrapper.appendChild(svg);

        [routeNodes[0], routeNodes[routeNodes.length - 1]].forEach((node, index) => {
            const marker = document.createElement('div');
            marker.className = `route-node-marker ${index === 0 ? 'route-start-marker' : 'route-end-marker'}`;
            marker.style.left = `${node.x}px`;
            marker.style.top = `${node.y}px`;
            marker.textContent = index === 0 ? 'A' : 'B';
            mapWrapper.appendChild(marker);
        });
    }

    function renderRouteLoading(startNode, goalNode) {
        const bottomSheet = document.getElementById('bottomSheet');
        const sheetContent = document.getElementById('sheetContent');
        if (!bottomSheet || !sheetContent) return;

        sheetContent.innerHTML = `
            <div class="calc-container">
                <div class="calc-text">กำลังค้นหาเส้นทาง ${nodeTitle(startNode.id)} to ${nodeTitle(goalNode.id)}</div>
                <div class="progress-wrapper"><div class="progress-bar" style="width: 70%;"></div></div>
            </div>
        `;
        bottomSheet.classList.add('show');
    }

    function renderRouteResult(startNode, goalNode, pathfindingData, directionData) {
        const bottomSheet = document.getElementById('bottomSheet');
        const sheetContent = document.getElementById('sheetContent');
        if (!bottomSheet || !sheetContent) return;

        const instructions = directionData.instructions || [];
        const instructionItems = instructions.length > 0 ? instructions.map(item => `
            <li class="instruction-item">
                <span class="instruction-step">${item.step}</span>
                <div>
                    <strong>${item.instruction}</strong>
                    <small>${item.direction} · ${item.distance} ${item.unit || 'm'}</small>
                </div>
            </li>
        `).join('') : `
            <li class="instruction-item">
                <span class="instruction-step">!</span>
                <div>
                    <strong>Direction service ยังไม่พร้อม</strong>
                    <small>แสดงเส้นทางจาก Route API ก่อน</small>
                </div>
            </li>
        `;

        sheetContent.innerHTML = `
            <div class="result-header">
                <div class="route-title">
                    <i class="fas fa-route"></i>
                    <span>${nodeTitle(startNode.id)} to ${nodeTitle(goalNode.id)}</span>
                    <span class="route-dist">${pathfindingData.total_distance} m</span>
                </div>
                <div class="route-subtitle">${pathfindingData.path.map(nodeTitle).join(' -> ')}</div>
            </div>
            <div class="route-stats">
                <span>${pathfindingData.path.length} nodes</span>
                <span>${instructions.length || 'route only'} steps</span>
            </div>
            <ol class="instruction-list">${instructionItems}</ol>
        `;
        bottomSheet.classList.add('show');
    }

    function renderRouteError(message) {
        const bottomSheet = document.getElementById('bottomSheet');
        const sheetContent = document.getElementById('sheetContent');
        if (!bottomSheet || !sheetContent) return;

        sheetContent.innerHTML = `
            <div class="route-error">
                <strong>หาเส้นทางไม่สำเร็จ</strong>
                <p>${message}</p>
            </div>
        `;
        bottomSheet.classList.add('show');
    }

    async function requestRoute(startNode, goalNode) {
        const pathfindingUrl = apiUrl(`/route?start=${encodeURIComponent(startNode.id)}&end=${encodeURIComponent(goalNode.id)}`);
        const pathfindingData = await fetchJson(pathfindingUrl);
        let directionData = { instructions: [], total_distance: pathfindingData.total_distance };

        try {
            directionData = await fetchJson(apiUrl('/direction'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ path: pathfindingData.path })
            });
        } catch (error) {
            console.warn('[Task2/US5] Direction service unavailable, showing route only:', error);
        }

        return { pathfindingData, directionData };
    }

    window.navigateUser = async function navigateUser(event) {
        if (event) event.preventDefault();
        const startInput = document.getElementById('start-query');
        const goalInput = document.getElementById('goal-query');
        const startNode = resolveInputNode(startInput);
        const targetNode = resolveInputNode(goalInput);

        if (!startNode || !targetNode) {
            alert('กรุณาเลือกจุดเริ่มต้นและปลายทางจากรายการแนะนำ');
            return;
        }

        try {
            setNavigateButtonLoading(true);
            renderRouteLoading(startNode, targetNode);
            const { pathfindingData, directionData } = await requestRoute(startNode, targetNode);
            state.currentRoutePath = pathfindingData.path;
            renderRouteResult(startNode, targetNode, pathfindingData, directionData);
            drawRouteOnCurrentFloor(pathfindingData.path);
        } catch (error) {
            console.error('[Task2/US5] Navigation failed:', error);
            renderRouteError(error.message);
        } finally {
            setNavigateButtonLoading(false);
        }
    };
    window.__cs232SearchAddon.navigateUser = window.navigateUser;

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
            document.querySelectorAll('.floor-btn').forEach(button => {
                button.addEventListener('click', () => setTimeout(() => drawRouteOnCurrentFloor(state.currentRoutePath), 50));
            });
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

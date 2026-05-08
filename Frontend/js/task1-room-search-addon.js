/*
 * Task4 / US1 Add-on: Room Search UI
 * Updated version - Compact, No Text Tip, Swipe Support, Bugs Fixed
 */
(function () {
    'use strict';

    const GRAPH_URL = 'graph.json';
    const API_BASE_URL = String(window.CS232_API_BASE || '').trim();
    const state = {
        graph: null,
        nodes: [],
        searchItems: [],
        currentRoutePath: [],
        stepInstructions: [],
        currentStepIndex: 0
    };

    window.__cs232SearchAddon = window.__cs232SearchAddon || {};
    window.__cs232SearchAddon.state = state;

    function normalize(text) {
        return String(text || '').trim().toLowerCase();
    }

    function displayNodeName(node) {
        if (!node) return '';
        const lang = window.__lang || 'th';
        if (lang === 'en' && node.name_en) return node.name_en;
        return node.name || String(node.id || '').replace(/^LC3_/, '').replace(/^F2_/, '');
    }

    function itemFromNode(node, prefixText) {
        const lang = window.__lang || 'th';
        const roomName = (lang === 'en' && node.name_en) ? node.name_en : (node.name || '');
        const room = roomName || String(node.id || '').replace(/^LC3_/, '').replace(/^F2_/, '');

        let label = node.label || node.type || 'Location';
        if (lang === 'en') {
            const typeDict = { 'ห้อง': 'Room', 'บันได': 'Stairs', 'ทางเข้า': 'Entrance', 'สิ่งอำนวยความสะดวก': 'Facility', 'room': 'Room', 'stairs': 'Stairs', 'entrance': 'Entrance', 'facility': 'Facility' };
            label = typeDict[label.toLowerCase()] || label;
        }

        const floorText = node.floor ? (lang === 'en' ? `Floor ${node.floor}` : `ชั้น ${node.floor}`) : '';
        const title = prefixText ? `${prefixText} ${room}` : room;
        
        return {
            category: node.type || 'room',
            SearchTerm: `${title} ${label} ${floorText}`.trim(),
            RoomNumber: room,
            RoomName: `${label}${floorText ? ' · ' + floorText : ''}`,
            node_id: node.id,
            X: Number(node.x),
            Y: Number(node.y),
            floor: node.floor,
            originalNode: node
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
            state.nodes.find(node => normalize(node.name_en) === query) ||
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

    function setEventFabVisible(visible) {
        const fab = document.getElementById('eventFab');
        if (!fab) return;
        if (visible) fab.classList.remove('hidden');
        else fab.classList.add('hidden');
    }

    function getSheet() {
        return {
            sheet: document.getElementById('bottomSheet'),
            content: document.getElementById('sheetContent')
        };
    }

    function openSheet() {
        const { sheet } = getSheet();
        if (sheet) {
            sheet.classList.add('show');
            setEventFabVisible(false);
        }
    }

    function closeSheet() {
        const { sheet, content } = getSheet();
        if (sheet) {
            sheet.classList.remove('show');
            setEventFabVisible(true);
            setTimeout(() => { if (content) content.innerHTML = ''; }, 300);
        }
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

        [ [startInput, startList], [goalInput, goalList] ].forEach(([input, list]) => {
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
        const text = await response.text();
        let data;
        try {
            data = text ? JSON.parse(text) : {};
        } catch (error) {
            data = { error: text || response.statusText };
        }

        if (!response.ok || data.status === 'fail') {
            throw new Error(data.error || data.message || `Navigation request failed (${response.status})`);
        }
        return data;
    }

    function setNavigateButtonLoading(isLoading) {
        const button = document.getElementById('btn-navigate');
        const t = window.__i18n?.[window.__lang || 'th'] || {};
        if (!button) return;
        button.disabled = isLoading;
        button.innerHTML = isLoading
            ? `<i class="fas fa-spinner fa-spin"></i> ${t.loading || 'กำลังค้นหา…'}`
            : (t.navigateBtn || '<i class="fas fa-route"></i> นำทาง');
    }

    function activeFloor() {
        const activeButton = document.querySelector('.floor-btn.active');
        return activeButton ? String(activeButton.getAttribute('data-floor')) : '1';
    }

    function clearRouteOverlay() {
        document.querySelectorAll('.route-path-line, .route-node-marker, .route-step-highlight').forEach(el => el.remove());
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

        const polylineBg = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
        polylineBg.setAttribute('points', routeNodes.map(node => `${node.x},${node.y}`).join(' '));
        polylineBg.setAttribute('fill', 'none');
        polylineBg.setAttribute('stroke', 'rgba(26,115,232,0.25)');
        polylineBg.setAttribute('stroke-width', '12');
        polylineBg.setAttribute('stroke-linecap', 'round');
        polylineBg.setAttribute('stroke-linejoin', 'round');
        svg.appendChild(polylineBg);

        const polyline = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
        polyline.setAttribute('points', routeNodes.map(node => `${node.x},${node.y}`).join(' '));
        polyline.setAttribute('fill', 'none');
        polyline.setAttribute('stroke', '#1a73e8');
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
            marker.innerHTML = index === 0
                ? '<i class="fas fa-circle-dot" style="font-size:11px"></i>'
                : '<i class="fas fa-flag-checkered" style="font-size:11px"></i>';
            mapWrapper.appendChild(marker);
        });
    }

    function showStepHighlight(node) {
        document.querySelectorAll('.route-step-highlight').forEach(el => el.remove());
        if (!node) return;

        const floor = activeFloor();
        
        // ถ้า Step ถัดไปอยู่คนละชั้น ให้จำลองการกดปุ่มเปลี่ยนชั้นอัตโนมัติ
        if (String(node.floor) !== String(floor)) {
            const targetFloorBtn = document.querySelector(`.floor-btn[data-floor="${node.floor}"]`);
            if (targetFloorBtn) {
                targetFloorBtn.click();
            }
        }

        const mapWrapper = document.getElementById('mapWrapper');
        if (!mapWrapper) return;

        const dot = document.createElement('div');
        dot.className = 'route-step-highlight';
        dot.style.left = `${node.x}px`;
        dot.style.top = `${node.y}px`;
        mapWrapper.appendChild(dot);

        // สั่งให้แมพขยับตามพิกัด (Pan) ไปตรงสเต็ปนั้นๆ
        if (typeof window.setInitialLocation === 'function') {
            window.setInitialLocation(node.x, node.y, null, false, node.floor);
        }
    }

    function edgeBetween(startId, endId) {
        const edges = state.graph && Array.isArray(state.graph.edges) ? state.graph.edges : [];
        return edges.find(edge =>
            (edge.from === startId && edge.to === endId) ||
            (edge.from === endId && edge.to === startId)
        );
    }

    function routeSegmentDistance(startNode, endNode, edge) {
        const rawDistance = edge ? Number(edge.distance) : 0;
        if (Number.isFinite(rawDistance) && rawDistance > 0) return Math.round(rawDistance * 10) / 10;

        const dx = Number(endNode.x || 0) - Number(startNode.x || 0);
        const dy = Number(endNode.y || 0) - Number(startNode.y || 0);
        return Math.round(Math.hypot(dx, dy) * 10) / 10;
    }

    function vectorBetweenNodes(startNode, endNode) {
        return {
            x: Number(endNode.x || 0) - Number(startNode.x || 0),
            y: Number(endNode.y || 0) - Number(startNode.y || 0)
        };
    }

    function turnDirection(previousVector, nextVector) {
        const previousLength = Math.hypot(previousVector.x, previousVector.y);
        const nextLength = Math.hypot(nextVector.x, nextVector.y);
        if (!previousLength || !nextLength) return { direction: 'straight' };

        const dot = previousVector.x * nextVector.x + previousVector.y * nextVector.y;
        const cross = previousVector.x * nextVector.y - previousVector.y * nextVector.x;
        const angle = Math.atan2(cross, dot) * 180 / Math.PI;
        const absAngle = Math.abs(angle);

        if (absAngle < 30) return { direction: 'straight' };
        if (absAngle > 150) return { direction: 'u_turn' };
        if (angle > 0) return { direction: 'right' };
        return { direction: 'left' };
    }

    function isStairSegment(startNode, endNode, edge) {
        const edgeType = edge && edge.type;
        return ['stairs', 'up', 'down'].includes(edgeType) ||
            startNode.type === 'stairs' && endNode.type === 'stairs' && startNode.floor !== endNode.floor;
    }

    function buildRouteInstructions(path) {
        if (!Array.isArray(path) || path.length < 2) return [];

        const rawInstructions = [];
        for (let index = 0; index < path.length - 1; index += 1) {
            const startId = path[index];
            const endId = path[index + 1];
            const startNode = findNodeByIdOrName(startId);
            const endNode = findNodeByIdOrName(endId);
            if (!startNode || !endNode) continue;

            const edge = edgeBetween(startId, endId);
            const distance = routeSegmentDistance(startNode, endNode, edge);
            let direction = 'straight';
            let action = 'walk';

            if (isStairSegment(startNode, endNode, edge)) {
                const startFloor = Number(startNode.floor || 0);
                const endFloor = Number(endNode.floor || 0);
                if ((edge && edge.type === 'up') || endFloor > startFloor) {
                    direction = 'up'; action = 'stairs_up';
                } else if ((edge && edge.type === 'down') || endFloor < startFloor) {
                    direction = 'down'; action = 'stairs_down';
                } else {
                    direction = 'stairs'; action = 'stairs';
                }
            } else if (index > 0) {
                const previousNode = findNodeByIdOrName(path[index - 1]);
                if (previousNode) {
                    const turn = turnDirection(vectorBetweenNodes(previousNode, startNode), vectorBetweenNodes(startNode, endNode));
                    direction = turn.direction;
                    action = direction === 'straight' ? 'walk' : `turn_${direction}`;
                }
            }

            rawInstructions.push({ action, direction, from_node: startId, to_node: endId, distance, floor: startNode.floor });
        }

        const mergedInstructions = [];
        for (const inst of rawInstructions) {
            if (mergedInstructions.length === 0) {
                mergedInstructions.push(inst);
                continue;
            }
            const last = mergedInstructions[mergedInstructions.length - 1];
            if (inst.action === 'walk' && last.action === 'walk' && inst.floor === last.floor) {
                last.to_node = inst.to_node;
                last.distance = (last.distance || 0) + (inst.distance || 0);
                last.distance = Math.round(last.distance * 10) / 10;
            } else {
                mergedInstructions.push(inst);
            }
        }

        const t = window.__i18n?.[window.__lang || 'th'] || {};

        mergedInstructions.forEach((inst, idx) => {
            inst.step = idx + 1;
            if (inst.action === 'walk') {
                inst.instruction = `${t.walkStraight || 'เดินตรงไป'} ${inst.distance > 0 ? inst.distance + ' ' + (t.meters || 'เมตร') : ''}`.trim();
            } else if (inst.action === 'turn_right') {
                inst.instruction = t.turnRight || 'เลี้ยวขวา';
            } else if (inst.action === 'turn_left') {
                inst.instruction = t.turnLeft || 'เลี้ยวซ้าย';
            } else if (inst.action === 'u_turn') {
                inst.instruction = t.uTurn || 'กลับหลัง';
            } else if (inst.action === 'stairs_up') {
                inst.instruction = `${t.stairsUp || 'ขึ้นบันไดไปชั้น'} ${findNodeByIdOrName(inst.to_node)?.floor || ''}`;
            } else if (inst.action === 'stairs_down') {
                inst.instruction = `${t.stairsDown || 'ลงบันไดไปชั้น'} ${findNodeByIdOrName(inst.to_node)?.floor || ''}`;
            }
        });

        return mergedInstructions;
    }

    const actionMeta = {
        walk:        { icon: 'fa-arrow-up',      cls: ''        },
        turn_right:  { icon: 'fa-arrow-right',   cls: 'right'   },
        turn_left:   { icon: 'fa-arrow-left',    cls: 'left'    },
        u_turn:      { icon: 'fa-arrow-down',    cls: 'uturn'   },
        stairs_up:   { icon: 'fa-stairs',        cls: 'stairs'  },
        stairs_down: { icon: 'fa-stairs',        cls: 'stairs'  },
        stairs:      { icon: 'fa-stairs',        cls: 'stairs'  },
    };

    function renderStepByStep(instructions, goalNode, startIndex) {
        const idx = Math.max(0, Math.min(startIndex, instructions.length));
        state.currentStepIndex = idx;

        const isArrived = idx >= instructions.length;
        const total = instructions.length;
        const t = window.__i18n?.[window.__lang || 'th'] || {};

        if (!isArrived) {
            const currentInst = instructions[idx];
            const targetNode = findNodeByIdOrName(currentInst.to_node);
            if (targetNode) showStepHighlight(targetNode);
        } else {
            showStepHighlight(goalNode);
        }

        document.querySelectorAll('.nav-step').forEach((el, i) => {
            el.classList.toggle('current-step-highlight', i === idx && !isArrived);
        });

        const currentStepEl = document.getElementById('rs-current-step');
        const stepNumEl = document.getElementById('rs-step-num');
        const stepTextEl = document.getElementById('rs-step-text');
        const stepIconEl = document.getElementById('rs-step-icon');
        const prevBtn = document.getElementById('rs-prev-btn');
        const nextBtn = document.getElementById('rs-next-btn');
        const badgeEl = document.getElementById('rs-step-badge-count');

        if (isArrived) {
            if (currentStepEl) currentStepEl.style.background = '#188038';
            if (stepNumEl) stepNumEl.textContent = t.arrived || 'ถึงแล้ว!';
            if (stepTextEl) stepTextEl.textContent = displayNodeName(goalNode);
            if (stepIconEl) stepIconEl.className = 'fas fa-flag-checkered';
            if (nextBtn) {
                // ทำให้ปุ่มไม่เป็นสถานะ disabled และสามารถกดเพื่อล้างเส้นทางได้
                nextBtn.disabled = false;
                nextBtn.innerHTML = `<i class="fas fa-flag-checkered"></i> ${t.arrived || 'ถึงแล้ว!'}`;
            }
        } else {
            const inst = instructions[idx];
            const meta = actionMeta[inst.action] || actionMeta.walk;
            if (currentStepEl) currentStepEl.style.background = '';
            if (stepNumEl) stepNumEl.textContent = `${t.step || 'ขั้นตอนที่'} ${idx + 1} ${t.stepOf || 'จาก'} ${total}`;
            if (stepTextEl) stepTextEl.textContent = inst.instruction;
            if (stepIconEl) stepIconEl.className = `fas ${meta.icon}`;
            if (nextBtn) {
                nextBtn.disabled = false;
                nextBtn.innerHTML = idx < total - 1
                    ? `${t.next || 'ถัดไป'} <i class="fas fa-chevron-right"></i>`
                    : `${t.lastStep || 'ขั้นตอนสุดท้าย'} <i class="fas fa-flag-checkered"></i>`;
            }
        }

        if (prevBtn) {
            prevBtn.disabled = idx === 0;
            prevBtn.innerHTML = `<i class="fas fa-chevron-left"></i> ${t.prev || 'ก่อนหน้า'}`;
        }
        if (badgeEl) badgeEl.textContent = isArrived ? `${total}/${total}` : `${idx + 1}/${total}`;
    }

    function renderRouteResult(startNode, goalNode, pathfindingData) {
        const { sheet, content } = getSheet();
        if (!sheet || !content) return;

        const t = window.__i18n?.[window.__lang || 'th'] || {};
        const instructions = buildRouteInstructions(pathfindingData.path);

        state.stepInstructions = instructions;
        state.currentStepIndex = 0;

        const total = instructions.length;

        const stepsHtml = instructions.map((item, idx) => {
            const meta = actionMeta[item.action] || actionMeta.walk;
            const isLast = idx === instructions.length - 1;
            return `
            <li class="nav-step ${meta.cls}" data-step-index="${idx}" id="nav-step-${idx}">
                <div class="nav-step__line-wrap">
                    <div class="nav-step__icon">
                        <i class="fas ${meta.icon}"></i>
                    </div>
                    ${!isLast ? '<div class="nav-step__connector"></div>' : ''}
                </div>
                <div class="nav-step__body">
                    <div class="nav-step__num">${t.step || 'ขั้นตอนที่'} ${idx + 1}</div>
                    <div class="nav-step__text">${item.instruction}</div>
                </div>
            </li>`;
        }).join('');

        const arrivedHtml = `
            <li class="nav-step nav-step--arrived" id="nav-step-${total}">
                <div class="nav-step__line-wrap">
                    <div class="nav-step__icon"><i class="fas fa-flag-checkered"></i></div>
                </div>
                <div class="nav-step__body">
                    <div class="nav-step__num">${t.arrivedAt || 'จุดหมาย'}</div>
                    <div class="nav-step__text">${displayNodeName(goalNode)}</div>
                </div>
            </li>`;

        const firstInst = instructions[0];
        const firstMeta = firstInst ? (actionMeta[firstInst.action] || actionMeta.walk) : actionMeta.walk;

        content.innerHTML = `
            <div class="rs-dest-row">
                <i class="fas fa-location-dot rs-dest-icon"></i>
                <span class="rs-dest-label">${displayNodeName(goalNode)}</span>
                <button class="rs-close-btn" id="rs-close-btn" title="${t.close || 'ปิด'}">
                    <i class="fas fa-times"></i>
                </button>
            </div>

            <div class="rs-step-badge">
                <span class="rs-step-badge__label"><i class="fas fa-shoe-prints" style="margin-right:5px"></i>${total} ${t.steps || 'ขั้นตอน'}</span>
                <span class="rs-step-badge__count" id="rs-step-badge-count">1/${total}</span>
            </div>

            <div class="rs-current-step" id="rs-current-step">
                <div class="rs-current-step__icon">
                    <i class="fas ${firstMeta.icon}" id="rs-step-icon"></i>
                </div>
                <div class="rs-current-step__body">
                    <div class="rs-current-step__num" id="rs-step-num">${t.step || 'ขั้นตอนที่'} 1 ${t.stepOf || 'จาก'} ${total}</div>
                    <div class="rs-current-step__text" id="rs-step-text">${firstInst ? firstInst.instruction : (t.start || 'เริ่มต้น')}</div>
                </div>
            </div>

            <div class="rs-step-nav" style="margin-bottom: 0;">
                <button class="rs-step-prev" id="rs-prev-btn" disabled>
                    <i class="fas fa-chevron-left"></i> ${t.prev || 'ก่อนหน้า'}
                </button>
                <button class="rs-step-next" id="rs-next-btn">
                    ${total > 1 ? `${t.next || 'ถัดไป'} <i class="fas fa-chevron-right"></i>` : `${t.lastStep || 'ขั้นตอนสุดท้าย'} <i class="fas fa-flag-checkered"></i>`}
                </button>
            </div>

            <div class="nav-steps-wrap collapsed" id="navStepsWrap">
                <ol class="nav-steps-list">
                    ${stepsHtml}
                    ${arrivedHtml}
                </ol>
            </div>
        `;

        const prevBtn = document.getElementById('rs-prev-btn');
        const nextBtn = document.getElementById('rs-next-btn');
        const closeBtn = document.getElementById('rs-close-btn');

        prevBtn && prevBtn.addEventListener('click', () => {
            if (state.currentStepIndex > 0) {
                renderStepByStep(instructions, goalNode, state.currentStepIndex - 1);
            }
        });

        // เมื่อกดปุ่ม Next / ถึงแล้ว
        nextBtn && nextBtn.addEventListener('click', () => {
            if (state.currentStepIndex < instructions.length) {
                renderStepByStep(instructions, goalNode, state.currentStepIndex + 1);
            } else {
                // ถ้าอยู่ที่ขั้นตอนสุดท้าย (ถึงแล้ว) เมื่อกดจะทำการปิดหน้าต่างและเคลียร์เส้นทาง
                if(typeof window.closeBottomSheet === 'function') window.closeBottomSheet();
                clearRouteOverlay();
                state.currentRoutePath = [];
                state.stepInstructions = [];
            }
        });

        content.querySelectorAll('.nav-step[data-step-index]').forEach(el => {
            el.addEventListener('click', () => {
                const stepIdx = parseInt(el.dataset.stepIndex, 10);
                if (!isNaN(stepIdx)) renderStepByStep(instructions, goalNode, stepIdx);
            });
        });

        closeBtn && closeBtn.addEventListener('click', () => {
            if(typeof window.closeBottomSheet === 'function') window.closeBottomSheet();
            clearRouteOverlay();
            state.currentRoutePath = [];
            state.stepInstructions = [];
        });

        openSheet();
        renderStepByStep(instructions, goalNode, 0);
    }

    function renderRouteLoading() {
        const { content } = getSheet();
        const t = window.__i18n?.[window.__lang || 'th'] || {};
        if (!content) return;
        content.innerHTML = `
            <div class="calc-container">
                <div class="calc-spinner"></div>
                <div class="calc-text">${t.loading || 'กำลังค้นหาเส้นทาง…'}</div>
            </div>`;
        openSheet();
    }

    function renderRouteError(message) {
        const { content } = getSheet();
        if (!content) return;
        content.innerHTML = `
            <div class="route-error">
                <strong>หาเส้นทางไม่สำเร็จ</strong>
                <p>${message}</p>
            </div>`;
        openSheet();
    }

    async function requestRoute(startNode, goalNode) {
        const endpoint = window.CS232_ROUTE_ENDPOINT || '/route';
        const pathfindingUrl = apiUrl(`${endpoint}?start=${encodeURIComponent(startNode.id)}&end=${encodeURIComponent(goalNode.id)}`);
        const pathfindingData = await fetchJson(pathfindingUrl);
        return { pathfindingData };
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
            renderRouteLoading();
            const { pathfindingData } = await requestRoute(startNode, targetNode);
            state.currentRoutePath = pathfindingData.path;
            renderRouteResult(startNode, targetNode, pathfindingData);
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

    window.__cs232SearchAddon.refreshLang = function() {
        if (!state.nodes || state.nodes.length === 0) return;
        
        state.searchItems = state.nodes
            .filter(node => node && node.x !== undefined && node.y !== undefined)
            .map(node => itemFromNode(node));
        rebuildMockData();

        if (state.currentRoutePath && state.currentRoutePath.length > 0) {
            const startNode = findNodeByIdOrName(state.currentRoutePath[0]);
            const goalNode = findNodeByIdOrName(state.currentRoutePath[state.currentRoutePath.length - 1]);
            renderRouteResult(startNode, goalNode, { path: state.currentRoutePath });
        }
    };

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
                button.addEventListener('click', () => {
                    setTimeout(() => {
                        drawRouteOnCurrentFloor(state.currentRoutePath);
                        if (state.stepInstructions && state.stepInstructions.length > 0) {
                            renderStepByStep(state.stepInstructions, null, state.currentStepIndex);
                        }
                    }, 50);
                });
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
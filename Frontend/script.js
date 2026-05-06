function debounce(func, delay) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), delay);
    };
}

document.addEventListener('DOMContentLoaded', function () {
    const searchInputs = document.querySelectorAll('#searchInput');
    const searchInput = searchInputs[searchInputs.length - 1];
    const clearSearchBtn = document.getElementById('clearSearch');
    const searchTags = document.getElementById('searchTags');
    const bottomSheet = document.getElementById('bottomSheet');
    const sheetContent = document.getElementById('sheetContent');
    
    // Elements สำหรับ Map
    const mapContainer = document.getElementById('mapContainer');
    const mapWrapper = document.getElementById('mapWrapper');
    const mapImage = document.getElementById('mapImage');
    const zoomInBtn = document.getElementById('zoomIn');
    const zoomOutBtn = document.getElementById('zoomOut');

    // ==========================================
    // เอนจิน Pan & Zoom สไตล์ Google Maps
    // ==========================================
    let currentScale = 1;
    let panX = 0;
    let panY = 0;
    const maxScale = 5.0;

    function getMinScale() {
        const imgWidth = mapImage.naturalWidth || 1000;
        const imgHeight = mapImage.naturalHeight || 800;
        const widthRatio = mapContainer.clientWidth / imgWidth;
        const heightRatio = mapContainer.clientHeight / imgHeight;
        return Math.max(widthRatio, heightRatio); // บังคับให้ภาพเต็มขอบจอเสมอ
    }

    function updateMapTransform() {
        const minScale = getMinScale();
        if (currentScale < minScale) currentScale = minScale;
        if (currentScale > maxScale) currentScale = maxScale;

        const imgWidth = mapImage.naturalWidth || 1000;
        const imgHeight = mapImage.naturalHeight || 800;
        const scaledWidth = imgWidth * currentScale;
        const scaledHeight = imgHeight * currentScale;

        // คำนวณขอบเขตเพื่อไม่ให้เลื่อนหลุดจอ
        let minX = mapContainer.clientWidth - scaledWidth;
        let maxX = 0;
        let minY = mapContainer.clientHeight - scaledHeight;
        let maxY = 0;

        if (scaledWidth < mapContainer.clientWidth) minX = maxX = (mapContainer.clientWidth - scaledWidth) / 2;
        if (scaledHeight < mapContainer.clientHeight) minY = maxY = (mapContainer.clientHeight - scaledHeight) / 2;

        if (panX < minX) panX = minX;
        if (panX > maxX) panX = maxX;
        if (panY < minY) panY = minY;
        if (panY > maxY) panY = maxY;

        // ขยับตัว Wrapper แทนการขยับรูป
        mapWrapper.style.transform = `translate(${panX}px, ${panY}px) scale(${currentScale})`;

        // ปรับขนาดหมุด (Marker) ไม่ให้ใหญ่ตามการซูม
        const marker = document.getElementById('marker');
        if (marker) marker.style.transform = `translate(-50%, -50%) scale(${1 / currentScale})`;
    }

    // ฟังก์ชันซูมเข้า-ออก โดยเล็งไปที่กึ่งกลางหน้าจอ
    function zoomToCenter(newScale) {
        const centerX = mapContainer.clientWidth / 2;
        const centerY = mapContainer.clientHeight / 2;
        const scaleRatio = newScale / currentScale;
        
        panX = centerX - (centerX - panX) * scaleRatio;
        panY = centerY - (centerY - panY) * scaleRatio;
        currentScale = newScale;
        updateMapTransform();
    }

    zoomInBtn.addEventListener('click', () => zoomToCenter(currentScale * 1.3));
    zoomOutBtn.addEventListener('click', () => zoomToCenter(currentScale / 1.3));

    // -- 1. ระบบลากด้วยเมาส์ (Desktop) --
    let isDragging = false;
    let startX, startY;

    mapContainer.addEventListener('mousedown', (e) => {
        isDragging = true;
        startX = e.clientX - panX;
        startY = e.clientY - panY;
    });

    window.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        e.preventDefault();
        panX = e.clientX - startX;
        panY = e.clientY - startY;
        updateMapTransform();
    });

    window.addEventListener('mouseup', () => isDragging = false);

    // -- 2. ระบบสัมผัสหน้าจอ (Touch Mobile) --
    let initialDistance = null;
    let initialScale = 1;
    let touchStartX, touchStartY;

    mapContainer.addEventListener('touchstart', (e) => {
        if (e.touches.length === 1) {
            isDragging = true;
            touchStartX = e.touches[0].clientX - panX;
            touchStartY = e.touches[0].clientY - panY;
        } else if (e.touches.length === 2) {
            isDragging = false;
            initialDistance = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );
            initialScale = currentScale;
        }
    }, { passive: false });

    mapContainer.addEventListener('touchmove', (e) => {
        e.preventDefault(); 
        if (e.touches.length === 1 && isDragging) {
            panX = e.touches[0].clientX - touchStartX;
            panY = e.touches[0].clientY - touchStartY;
            updateMapTransform();
        } else if (e.touches.length === 2 && initialDistance) {
            const currentDistance = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );
            const centerX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
            const centerY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
            
            const newScale = initialScale * (currentDistance / initialDistance);
            const scaleRatio = newScale / currentScale;
            
            panX = centerX - (centerX - panX) * scaleRatio;
            panY = centerY - (centerY - panY) * scaleRatio;
            currentScale = newScale;
            updateMapTransform();
        }
    }, { passive: false });

    mapContainer.addEventListener('touchend', (e) => {
        if (e.touches.length === 0) isDragging = false;
        else if (e.touches.length === 1) {
            initialDistance = null;
            touchStartX = e.touches[0].clientX - panX;
            touchStartY = e.touches[0].clientY - panY;
        }
    });

    // -- 3. ระบบซูมด้วยลูกกลิ้งเมาส์ (เล็งตรงไหน ซูมตรงนั้น) --
    mapContainer.addEventListener('wheel', (e) => {
        e.preventDefault();
        const delta = e.deltaY < 0 ? 1.15 : 1 / 1.15;
        const newScale = currentScale * delta;
        
        const rect = mapContainer.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        const scaleRatio = newScale / currentScale;
        panX = mouseX - (mouseX - panX) * scaleRatio;
        panY = mouseY - (mouseY - panY) * scaleRatio;
        currentScale = newScale;
        updateMapTransform();
    }, { passive: false });

    // ==========================================
    // ล็อคเป้าหมายเริ่มต้น (เปลี่ยนมารับค่า Pixel จริงจาก graph.json)
    // ==========================================
    function setInitialLocation(x, y, startZoom) {
        currentScale = startZoom;
        
        // รับค่าพิกัดมาตรงๆ ไม่ต้องเอาไปหาร 100 แล้ว
        const targetPixelX = parseFloat(x);
        const targetPixelY = parseFloat(y);
        
        // คำนวณให้จุดเป้าหมายอยู่กึ่งกลางหน้าจอ
        panX = (mapContainer.clientWidth / 2) - (targetPixelX * currentScale);
        panY = (mapContainer.clientHeight / 2) - (targetPixelY * currentScale);
        
        updateMapTransform();
        
        // แจ้งเตือนดูว่าพิกัดถูกต้องไหม (ถ้าเทสผ่านแล้ว ลบบรรทัด log นี้ทิ้งได้ครับ)
        console.log("เลื่อนแผนที่ไปที่ Pixel X:", targetPixelX, " Y:", targetPixelY);
        
        // ส่งพิกัดไปให้ฟังก์ชันวาดจุดแดง
        if (typeof highlightRoom === 'function') {
            highlightRoom(targetPixelX, targetPixelY);
        }
    }

    async function initMap() {
    const urlParams = new URLSearchParams(window.location.search);
    const currentLocationId = urlParams.get('loc_id');

    if (currentLocationId) {
        try {
            const response = await fetch('graph.json');
            if (!response.ok) throw new Error("หาไฟล์ไม่เจอ");
            
            const data = await response.json();

            // ค้นหาห้องจากในไฟล์ JSON
            const locationData = data.nodes.find(node => node.id === currentLocationId);

            if (locationData) {
                const activeFloorBtn = document.querySelector('.floor-btn.active');
                const currentFloorOnUI = activeFloorBtn ? activeFloorBtn.getAttribute('data-floor') : '1';

                // Autofill ช่อง From
                const startInput = document.getElementById('start-query');
                if (startInput) {
                    let displayFrom = currentLocationId.replace('LC3_', '').replace('F2_', '');

                    startInput.value = displayFrom; 
                }

                // วางหมุดเมื่อรูปพร้อม
                    const placeMarkerWhenReady = () => {
                        if (mapImage.complete && mapImage.naturalWidth > 0) {
                            setInitialLocation(locationData.x, locationData.y, 2.5);
                        } else {
                            mapImage.onload = () => {
                                setInitialLocation(locationData.x, locationData.y, 2.5);
                                mapImage.onload = null; // ป้องกันลูป
                            };
                        }
                    };

                // สลับชั้นถ้ายืนอยู่คนละชั้น
                if (String(locationData.floor) !== currentFloorOnUI) {
                    const targetFloorBtn = document.querySelector(`.floor-btn[data-floor="${locationData.floor}"]`);
                    if (targetFloorBtn) {
                        targetFloorBtn.click();
                        placeMarkerWhenReady();
                    }
                } else {
                    placeMarkerWhenReady();
                }
            } else {
                console.error("ไม่พบห้องนี้", currentLocationId);
            }
        } catch (error) {
            console.error("เกิดข้อผิดพลาด:", error);
        }
    } else {
        // ถ้าเปิดเว็บมาเฉยๆให้โชว์จุดเริ่มต้นตรงนี้
        if (mapImage.complete) setInitialLocation(193, 175, 1.8);
            else mapImage.onload = () => setInitialLocation(193, 175, 1.8);
     }
    }

    // ==========================================
    // UI ควบคุมต่างๆ (ปุ่มเปลี่ยนชั้น, ภาษา, ค้นหา)
    // ==========================================
    const floorBtns = document.querySelectorAll('.floor-btn');
    floorBtns.forEach(btn => {
        btn.addEventListener('click', function () {
            floorBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            mapImage.src = this.getAttribute('data-floor') === '1' 
                ? 'resources/LC3-MAP-1stFloor.svg' 
                : 'resources/LC3-MAP-2ndFloor.svg';
        });
    });

    const langToggle = document.getElementById('langToggle');
    let isThai = true;
    langToggle.addEventListener('click', () => {
        isThai = !isThai;
        langToggle.innerText = isThai ? 'TH' : 'EN';
        document.querySelector('.logo-text p').innerText = isThai ? 'ระบบนำทางในอาคารบร.3' : 'LC3 Building Navigation';
        searchInput.placeholder = isThai ? 'ค้นหาห้องเรียน' : 'Search rooms';
        document.querySelector('.tag-label').innerText = isThai ? 'แนะนำ:' : 'Suggest:';
    });

    searchInput.addEventListener('input', debounce(function () {
        const query = this.value.trim().toLowerCase();
        if (query.length > 0) {
            clearSearchBtn.style.display = 'block';
            searchTags.style.display = 'none';
            const results = mockData.filter(item => item.SearchTerm.toLowerCase().includes(query));
            showSearchResults(results);
        } else {
            closeBottomSheet();
        }
    }, 200));

    //เปิดปิด search
    const toggleSearchBtn = document.getElementById('toggleSearchBtn');
    const searchPanelContent = document.getElementById('search-panel-content');

    // สั่งเปิด-ปิด เมื่อกดลูกศร
    toggleSearchBtn.addEventListener('click', () => {
        searchPanelContent.classList.toggle('collapsed');
        toggleSearchBtn.classList.toggle('rotated');
    });

    function showSearchResults(results) {
        if (!bottomSheet || !sheetContent) return;
        let html = `<div class="search-header">ผลลัพธ์</div>`;
        if (results.length === 0) html += `<div class="result-item">ไม่พบข้อมูล</div>`;
        else {
            results.forEach(item => {
                html += `
                    <div class="result-item" onclick="selectRoom('${item.RoomNumber}', ${item.X}, ${item.Y})">
                        <b>${item.SearchTerm}</b><br><small>${item.RoomName}</small>
                    </div>`;
            });
        }
        sheetContent.innerHTML = html;
        bottomSheet.classList.add('show');
    }

    window.selectRoom = function(roomName, x, y) {
        searchInput.value = roomName;
        setInitialLocation(x, y, Math.max(getMinScale(), 2.8));
        
        sheetContent.innerHTML = `
            <div style="text-align:center;">
                <h3>ไป ${roomName}</h3>
                <p>กำลังนำทาง...</p>
            </div>`;
    }

    function highlightRoom(x, y) {
    removeMarker();
    const marker = document.createElement('div');
    marker.id = 'marker';
    marker.style.position = 'absolute';
    
    // ใช้เป็น px แทน
    marker.style.top = y + 'px';
    marker.style.left = x + 'px';
    
    marker.style.width = '15px';
    marker.style.height = '15px';
    marker.style.background = 'red';
    marker.style.borderRadius = '50%';
    marker.style.transform = `translate(-50%, -50%) scale(${1 / currentScale})`;
    
    document.getElementById('mapWrapper').appendChild(marker); 
    }   

    function removeMarker() {
        const old = document.getElementById('marker');
        if (old) old.remove();
    }

    clearSearchBtn.addEventListener('click', () => {
        closeBottomSheet();
        removeMarker();
    });

    function closeBottomSheet() {
        bottomSheet.classList.remove('show');
        searchInput.value = '';
        clearSearchBtn.style.display = 'none';
        searchTags.style.display = 'flex';
        setTimeout(() => sheetContent.innerHTML = '', 300);
    }

    let isMapLoaded = false;
    window.addEventListener('load', () => {
        if (!isMapLoaded) {
            isMapLoaded = true;
            initMap(); // คราวนี้มันจะมองเห็น initMap แล้ว!
        }
    })
});

    /* ---- Begin merged add-ons: task1, task2, task3 ---- */
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
            // If overlay or input group missing, or addon already added, or page already provides a toggle, skip.
            if (!overlay || !inputGroup || document.getElementById('addonSearchPanelToggle') || document.getElementById('toggleSearchBtn')) return;

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

    (function () {
        'use strict';

        const COURSE_META_URL = 'course_sec_metadata.json';

        function normalizeNodeId(value) {
            const raw = String(value || '').trim();
            if (!raw) return raw;
            if (raw.startsWith('LC3_')) return raw;
            if (/^2\d{2}$/.test(raw) || raw.startsWith('F2_')) return `LC3_F2_${raw.replace(/^F2_/, '')}`;
            return `LC3_${raw}`;
        }

        async function loadCourseSecSearch() {
            const addon = window.__cs232SearchAddon;
            if (!addon || !addon.addItems || !addon.findNode) return;

            try {
                const response = await fetch(COURSE_META_URL);
                if (!response.ok) throw new Error(`Cannot load ${COURSE_META_URL}`);
                const metadata = await response.json();
                const items = metadata.map(row => {
                    const node = addon.findNode(normalizeNodeId(row.node_id)) || addon.findNode(row.node_id);
                    if (!node) return null;
                    return {
                        category: 'course',
                        SearchTerm: `${row.course_id} sec ${row.sec} ${row.course_name || ''}`.trim(),
                        RoomNumber: node.name || row.node_id,
                        RoomName: `วิชา ${row.course_id} • Sec ${row.sec}`,
                        node_id: node.id,
                        X: Number(node.x),
                        Y: Number(node.y),
                        floor: node.floor
                    };
                });
                addon.addItems(items);
                document.dispatchEvent(new CustomEvent('cs232:course-sec-search-ready'));
            } catch (error) {
                console.error('[Task2/US3] Course/sec search add-on failed:', error);
            }
        }

        if (window.__cs232SearchAddon && window.__cs232SearchAddon.items) {
            loadCourseSecSearch();
        } else {
            document.addEventListener('cs232:room-search-ready', loadCourseSecSearch, { once: true });
        }
    })();

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

    /* ---- End merged add-ons ---- */
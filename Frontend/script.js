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
    const sheetOverlay = document.getElementById('sheetOverlay');
    const dragHandle = document.getElementById('dragHandle');

    if (sheetOverlay) {
        sheetOverlay.addEventListener('click', () => {
            const toggleBtn = document.getElementById('routeToggleBtn'); 
            const closeBtn = document.querySelector('.route-close-btn');
            
            if (toggleBtn && toggleBtn.innerText.includes('ย่อ')) {
                toggleBtn.click();
            } else if (closeBtn) {
                closeBtn.click();
            } else if (typeof window.closeBottomSheet === 'function') {
                window.closeBottomSheet();
            }
            sheetOverlay.classList.remove('show');
        });
    }

   document.addEventListener('mousedown', (e) => {
        const startSuggestions = document.getElementById('start-suggestions');
        const goalSuggestions = document.getElementById('goal-suggestions');

        const forceHide = (box) => {
            if (box && box.innerHTML !== '') {
                box.classList.remove('active');
                box.style.display = 'none';
            }
        };

        if (e.target.closest('#start-query')) forceHide(goalSuggestions);
        if (e.target.closest('#goal-query')) forceHide(startSuggestions);
        if (!e.target.closest('#start-query') && !e.target.closest('#start-suggestions')) forceHide(startSuggestions);
        if (!e.target.closest('#goal-query') && !e.target.closest('#goal-suggestions')) forceHide(goalSuggestions);
    }, true);

    const startInputQuery = document.getElementById('start-query');
    const goalInputQuery = document.getElementById('goal-query');

    if (startInputQuery) {
        startInputQuery.addEventListener('input', () => {
            const box = document.getElementById('start-suggestions');
            if (box) box.style.display = '';
        });
    }
    if (goalInputQuery) {
        goalInputQuery.addEventListener('input', () => {
            const box = document.getElementById('goal-suggestions');
            if (box) box.style.display = '';
        });
    }

    const mapContainer = document.getElementById('mapContainer');
    const mapWrapper = document.getElementById('mapWrapper');
    const mapImage = document.getElementById('mapImage');
    const zoomInBtn = document.getElementById('zoomIn');
    const zoomOutBtn = document.getElementById('zoomOut');

    let currentScale = 1;
    let panX = 0;
    let panY = 0;
    const maxScale = 5.0;

    function getMinScale() {
        const imgWidth = mapImage.naturalWidth || 1000;
        const imgHeight = mapImage.naturalHeight || 800;
        const widthRatio = mapContainer.clientWidth / imgWidth;
        const heightRatio = mapContainer.clientHeight / imgHeight;
        return Math.min(widthRatio, heightRatio);
    }

    function updateMapTransform() {
        const minScale = getMinScale();
        if (currentScale < minScale) currentScale = minScale;
        if (currentScale > maxScale) currentScale = maxScale;

        const imgWidth = mapImage.naturalWidth || 1000;
        const imgHeight = mapImage.naturalHeight || 800;
        const scaledWidth = imgWidth * currentScale;
        const scaledHeight = imgHeight * currentScale;

        const overscrollY = mapContainer.clientHeight * 0.6;
        const overscrollX = mapContainer.clientWidth * 0.4;

        let minX = mapContainer.clientWidth - scaledWidth - overscrollX;
        let maxX = overscrollX;
        let minY = mapContainer.clientHeight - scaledHeight - overscrollY;
        let maxY = overscrollY;

        if (panX < minX) panX = minX;
        if (panX > maxX) panX = maxX;
        if (panY < minY) panY = minY;
        if (panY > maxY) panY = maxY;

        mapWrapper.style.transform = `translate(${panX}px, ${panY}px) scale(${currentScale})`;

        const marker = document.getElementById('marker');
        if (marker) marker.style.transform = `translate(-50%, -50%) scale(${1 / currentScale})`;
    }

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

    window.setInitialLocation = function(x, y, startZoom, shouldHighlight = true, floor = null) {
        if (startZoom !== null && startZoom !== undefined) {
            currentScale = startZoom;
        }

        const targetPixelX = parseFloat(x);
        const targetPixelY = parseFloat(y);

        panX = (mapContainer.clientWidth / 2) - (targetPixelX * currentScale);
        panY = (mapContainer.clientHeight / 2) - (targetPixelY * currentScale);

        updateMapTransform();

        if (shouldHighlight && typeof highlightRoom === 'function') {
            highlightRoom(targetPixelX, targetPixelY, floor);
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
                const locationData = data.nodes.find(node => node.id === currentLocationId);

                if (locationData) {
                    const activeFloorBtn = document.querySelector('.floor-btn.active');
                    const currentFloorOnUI = activeFloorBtn ? activeFloorBtn.getAttribute('data-floor') : '1';

                    const startInput = document.getElementById('start-query');
                    if (startInput) {
                        let displayFrom = currentLocationId.replace('LC3_', '').replace('F2_', '');
                        startInput.value = displayFrom;
                    }

                    const placeMarkerWhenReady = () => {
                        if (mapImage.complete && mapImage.naturalWidth > 0) {
                            setInitialLocation(locationData.x, locationData.y, 2.5, true, locationData.floor);
                        } else {
                            mapImage.onload = () => {
                                setInitialLocation(locationData.x, locationData.y, 2.5, true, locationData.floor);
                                mapImage.onload = null;
                            };
                        }
                    };

                    if (String(locationData.floor) !== currentFloorOnUI) {
                        const targetFloorBtn = document.querySelector(`.floor-btn[data-floor="${locationData.floor}"]`);
                        if (targetFloorBtn) {
                            targetFloorBtn.click();
                            placeMarkerWhenReady();
                        }
                    } else {
                        placeMarkerWhenReady();
                    }
                }
            } catch (error) {
                console.error("เกิดข้อผิดพลาด:", error);
            }
        } else {
            if (mapImage.complete) setInitialLocation(193, 175, 1.8, false);
            else mapImage.onload = () => setInitialLocation(193, 175, 1.8, false);
        }
    }

    const floorBtns = document.querySelectorAll('.floor-btn');
    floorBtns.forEach(btn => {
        btn.addEventListener('click', function () {
            floorBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            const selectedFloor = this.getAttribute('data-floor');
            mapImage.src = selectedFloor === '1'
                ? 'resources/LC3-MAP-1stFloor.svg'
                : 'resources/LC3-MAP-2ndFloor.svg';
                
            const marker = document.getElementById('marker');
            if (marker && marker.dataset.floor) {
                if (String(marker.dataset.floor) === String(selectedFloor)) {
                    marker.style.display = 'block'; 
                } else {
                    marker.style.display = 'none';  
                }
            }
        });
    });

    const langToggle = document.getElementById('langToggle');
    let isThai = true;

    const i18n = {
        th: {
            searchPlaceholder: 'ค้นหาห้อง, วิชา, งาน…',
            fromPlaceholder: 'จุดเริ่มต้น…',
            toPlaceholder: 'ปลายทาง…',
            navigateBtn: '<i class="fas fa-route"></i> นำทาง',
            routeFrom: 'จาก',
            routeTo: 'ไปยัง',
            distance: 'ระยะ',
            steps: 'ขั้นตอน',
            showDetail: 'แสดงรายละเอียด',
            hideDetail: 'ย่อรายละเอียด',
            close: 'ปิด',
            noResult: 'ไม่พบข้อมูล',
            loading: 'กำลังค้นหาเส้นทาง…',
            eventTitle: 'กิจกรรมวันนี้',
            walkStraight: 'เดินตรงไป',
            turnLeft: 'เลี้ยวซ้าย',
            turnRight: 'เลี้ยวขวา',
            uTurn: 'กลับหลัง',
            stairsUp: 'ขึ้นบันไดไปชั้น',
            stairsDown: 'ลงบันไดไปชั้น',
            useStairs: 'ใช้บันได',
            meters: 'เมตร',
            stepOf: 'จาก',
            step: 'ขั้นตอนที่',
            arrived: 'ถึงแล้ว!',
            arrivedAt: 'จุดหมาย',
            next: 'ถัดไป',
            lastStep: 'ขั้นตอนสุดท้าย',
            prev: 'ก่อนหน้า',
            start: 'เริ่มต้น'
        },
        en: {
            searchPlaceholder: 'Search room, course, event…',
            fromPlaceholder: 'Starting point…',
            toPlaceholder: 'Destination…',
            navigateBtn: '<i class="fas fa-route"></i> Navigate',
            routeFrom: 'From',
            routeTo: 'To',
            distance: 'Distance',
            steps: 'Steps',
            showDetail: 'Show details',
            hideDetail: 'Hide details',
            close: 'Close',
            noResult: 'Not found',
            loading: 'Finding route…',
            eventTitle: "Today's events",
            walkStraight: 'Walk straight',
            turnLeft: 'Turn left',
            turnRight: 'Turn right',
            uTurn: 'U-turn',
            stairsUp: 'Go up stairs to floor',
            stairsDown: 'Go down stairs to floor',
            useStairs: 'Use stairs',
            meters: 'm',
            stepOf: 'of',
            step: 'Step',
            arrived: 'Arrived!',
            arrivedAt: 'Destination',
            next: 'Next',
            lastStep: 'Last step',
            prev: 'Prev',
            start: 'Start'
        }
    };
    window.__i18n = i18n;
    window.__lang = 'th';

    function applyLang(lang) {
        const t = i18n[lang];
        window.__lang = lang;
        if (searchInput) searchInput.placeholder = t.searchPlaceholder;
        const startQ = document.getElementById('start-query');
        const goalQ  = document.getElementById('goal-query');
        if (startQ) startQ.placeholder = t.fromPlaceholder;
        if (goalQ)  goalQ.placeholder  = t.toPlaceholder;
        const navBtn = document.getElementById('btn-navigate');
        if (navBtn) navBtn.innerHTML = t.navigateBtn;
        
        if (window.__cs232SearchAddon && typeof window.__cs232SearchAddon.refreshLang === 'function') {
            window.__cs232SearchAddon.refreshLang();
        }
    }

    if (langToggle) {
        langToggle.addEventListener('click', () => {
            isThai = !isThai;
            const lang = isThai ? 'th' : 'en';
            langToggle.innerText = isThai ? 'TH' : 'EN';
            applyLang(lang);
        });
    }

    searchInput.addEventListener('input', debounce(function () {
        const query = this.value.trim().toLowerCase();
        if (query.length === 0) {
            window.closeBottomSheet();
            return;
        }
        clearSearchBtn.style.display = 'block';

        const data = window.mockData || [];
        if (data.length === 0) {
            sheetContent.innerHTML = `<div style="text-align:center;padding:24px;color:var(--on-surface-3);"><i class="fas fa-spinner fa-spin"></i> กำลังโหลดข้อมูล…</div>`;
            bottomSheet.classList.add('show');
            return;
        }
        const results = data.filter(item =>
            (item.SearchTerm || '').toLowerCase().includes(query) ||
            (item.RoomNumber || '').toLowerCase().includes(query) ||
            (item.RoomName || '').toLowerCase().includes(query)
        ).slice(0, 10);
        showSearchResults(results, query);
    }, 200));

    const toggleSearchBtn = document.getElementById('toggleSearchBtn');
    const searchPanelContent = document.getElementById('search-panel-content');

    if (toggleSearchBtn && searchPanelContent) {
        toggleSearchBtn.addEventListener('click', () => {
            searchPanelContent.classList.toggle('collapsed');
            toggleSearchBtn.classList.toggle('rotated');
        });
    }
    
    function showSearchResults(results, query) {
        if (!bottomSheet || !sheetContent) return;
        const catIcon  = { event: 'fa-calendar-alt', course: 'fa-book-open', room: 'fa-door-open', facility: 'fa-info-circle', stairs: 'fa-stairs', entrance: 'fa-sign-in-alt' };
        const catClass = { event: 'cat-event', course: 'cat-course', stairs: 'cat-stairs', entrance: 'cat-entrance' };
        
        const t = window.__i18n?.[window.__lang || 'th'] || {};
        const catLabel = window.__lang === 'en' 
            ? { event: 'Event', course: 'Course', room: 'Room', facility: 'Facility', stairs: 'Stairs', entrance: 'Entrance' }
            : { event: 'กิจกรรม', course: 'วิชา', room: 'ห้อง', facility: 'สิ่งอำนวยความสะดวก', stairs: 'บันได', entrance: 'ทางเข้า' };

        if (results.length === 0) {
            sheetContent.innerHTML = `
                <div class="result-empty">
                    <i class="fas fa-search-minus"></i>
                    <p>${t.noResult || 'ไม่พบข้อมูล'} "<b>${query}</b>"</p>
                </div>`;
        } else {
            const hi = (s) => s ? s.replace(new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'),
                m => `<mark style="background:var(--blue-light);color:var(--blue);border-radius:2px;padding:0 2px;font-style:normal">${m}</mark>`) : (s || '');
            let html = `<div class="search-header">${results.length} ผลลัพธ์</div>`;
            results.forEach(item => {
                const cat   = item.category || item.type || 'room';
                const icon  = catIcon[cat]  || 'fa-map-marker-alt';
                const cls   = catClass[cat] || '';
                const label = catLabel[cat] || (window.__lang === 'en' ? 'Location' : 'สถานที่');
                const sub   = item.RoomName ? item.RoomName : (label + (item.floor ? ` · ${window.__lang === 'en' ? 'Floor' : 'ชั้น'} ${item.floor}` : ''));
                
                html += `
                    <div class="result-item" onclick="selectRoom('${item.RoomNumber}',${item.X},${item.Y},'${item.node_id||''}','${item.floor||''}')">
                        <div class="result-icon ${cls}"><i class="fas ${icon}"></i></div>
                        <div class="result-text">
                            <b>${hi(item.RoomNumber || item.SearchTerm)}</b>
                            <small>${hi(sub)}</small>
                        </div>
                        <i class="fas fa-chevron-right result-chevron"></i>
                    </div>`;
            });
            sheetContent.innerHTML = html;
        }
        bottomSheet.classList.add('show');
    }

    window.selectRoom = function (roomName, x, y, nodeId, floor) {
        searchInput.value = roomName;

        if (floor) {
            const activeFloorBtn = document.querySelector('.floor-btn.active');
            const currentFloor = activeFloorBtn ? activeFloorBtn.getAttribute('data-floor') : null;
            
            if (currentFloor && String(floor) !== String(currentFloor)) {
                const targetFloorBtn = document.querySelector(`.floor-btn[data-floor="${floor}"]`);
                if (targetFloorBtn) {
                    targetFloorBtn.click();
                }
            }
        }

        if (x && y) setInitialLocation(x, y, Math.max(getMinScale(), 2.8), true, floor);

        const goalInput = document.getElementById('goal-query');
        if (goalInput) {
            goalInput.value = roomName;
            if (nodeId) goalInput.dataset.nodeId = nodeId;
        }
        const startInput = document.getElementById('start-query');
        if (startInput && !startInput.value.trim()) {
            setTimeout(() => startInput.focus(), 200);
        }

        const t = window.__i18n?.[window.__lang || 'th'] || {};
        const pinHint = window.__lang === 'en' ? 'Pinned · Set starting point to navigate' : 'ปักหมุดแล้ว · ระบุจุดเริ่มต้นเพื่อนำทาง';
        
        sheetContent.innerHTML = `
            <div class="pin-confirm">
                <div class="pin-confirm__icon"><i class="fas fa-map-marker-alt"></i></div>
                <div class="pin-confirm__body">
                    <div class="pin-confirm__name">${roomName}</div>
                    <div class="pin-confirm__hint">${pinHint}</div>
                </div>
                <button class="pin-confirm__close" onclick="window.closeBottomSheet(); window.removeMarker();">
                    <i class="fas fa-times"></i>
                </button>
            </div>`;
        bottomSheet.classList.add('show');
    }

    function highlightRoom(x, y, floor) {
        window.removeMarker();
        const marker = document.createElement('div');
        marker.id = 'marker';
        marker.style.position = 'absolute';
        marker.style.top = y + 'px';
        marker.style.left = x + 'px';
        marker.style.width = '15px';
        marker.style.height = '15px';
        marker.style.background = 'red';
        marker.style.borderRadius = '50%';
        marker.style.transform = `translate(-50%, -50%) scale(${1 / currentScale})`;
        
        if (floor) {
            marker.dataset.floor = floor;
        }

        document.getElementById('mapWrapper').appendChild(marker);
    }

    window.removeMarker = function() {
        const old = document.getElementById('marker');
        if (old) old.remove();
    }

    window.closeBottomSheet = function() {
        bottomSheet.classList.remove('show');
        if (sheetOverlay) sheetOverlay.classList.remove('show');
        searchInput.value = '';
        
        // --- เริ่มส่วนที่เพิ่มเข้ามา: เคลียร์ช่อง FROM / TO ---
        const startInput = document.getElementById('start-query');
        const goalInput = document.getElementById('goal-query');
        if (startInput) {
            startInput.value = '';
            startInput.dataset.nodeId = '';
        }
        if (goalInput) {
            goalInput.value = '';
            goalInput.dataset.nodeId = '';
        }
        // --- จบส่วนที่เพิ่มเข้ามา ---

        if (clearSearchBtn) clearSearchBtn.style.display = 'none';
        if (searchTags) searchTags.style.display = 'flex';
        setTimeout(() => sheetContent.innerHTML = '', 300);
    }
    clearSearchBtn.addEventListener('click', () => {
        window.closeBottomSheet();
        window.removeMarker();
    });

    // ==========================================
    // ระบบ Drag up / Drag down สำหรับ Bottom Sheet
    // ==========================================
    let sheetStartY = 0;
    let sheetCurrentY = 0;
    let isDraggingSheet = false;
    let sheetStartScrollTop = 0;

    const handleDragStart = (clientY) => {
        sheetStartY = clientY;
        sheetCurrentY = sheetStartY;
        isDraggingSheet = true;
        sheetStartScrollTop = sheetContent ? sheetContent.scrollTop : 0;
    };

    const handleDragMove = (clientY) => {
        if (isDraggingSheet) {
            sheetCurrentY = clientY;
        }
    };

    const handleDragEnd = () => {
        if (!isDraggingSheet) return;
        isDraggingSheet = false;

        const deltaY = sheetCurrentY - sheetStartY;
        const stepsWrap = document.getElementById('navStepsWrap');
        
        if (Math.abs(deltaY) > 40) {
            if (deltaY < 0) {
                if (stepsWrap && stepsWrap.classList.contains('collapsed')) {
                    stepsWrap.classList.remove('collapsed');
                }
            } else {
                const isContentScrolled = sheetContent && sheetContent.scrollTop > 0;
                
                if (!isContentScrolled && sheetStartScrollTop <= 0) {
                    if (stepsWrap && !stepsWrap.classList.contains('collapsed')) {
                        stepsWrap.classList.add('collapsed'); 
                    } else {
                        window.closeBottomSheet(); 
                        window.removeMarker();
                    }
                }
            }
        }
    };

    if (bottomSheet) {
        bottomSheet.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1) handleDragStart(e.touches[0].clientY);
        }, { passive: true });
        bottomSheet.addEventListener('touchmove', (e) => {
            handleDragMove(e.touches[0].clientY);
        }, { passive: true });
        bottomSheet.addEventListener('touchend', handleDragEnd);
    }

    if (dragHandle) {
        dragHandle.addEventListener('mousedown', (e) => handleDragStart(e.clientY));
        window.addEventListener('mousemove', (e) => handleDragMove(e.clientY));
        window.addEventListener('mouseup', handleDragEnd);
    }

    let isMapLoaded = false;
    window.addEventListener('load', () => {
        if (!isMapLoaded) {
            isMapLoaded = true;
            initMap(); 
        }
    })
});
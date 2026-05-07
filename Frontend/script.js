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

    // เปิดปิด search แบบเดิม: ใช้เฉพาะกรณีที่มี toggleSearchBtn อยู่ใน HTML
    const toggleSearchBtn = document.getElementById('toggleSearchBtn');
    const searchPanelContent = document.getElementById('search-panel-content');

    if (toggleSearchBtn && searchPanelContent) {
        toggleSearchBtn.addEventListener('click', () => {
            searchPanelContent.classList.toggle('collapsed');
            toggleSearchBtn.classList.toggle('rotated');
        });
    }
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

    window.selectRoom = function (roomName, x, y) {
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

    
    // ฟังก์ชันนำทาง เชื่อม Backend Gateway
    window.navigateUser = async function(event) {
        if (event) event.preventDefault(); // ป้องกันการรีเฟรชหน้าเว็บ

        const startInput = document.getElementById('start-query').value.trim();
        const goalInput = document.getElementById('goal-query').value.trim();

        if (!goalInput) {
            alert("กรุณาระบุจุดหมาย (TO) ที่ต้องการค้นหาครับ");
            return;
        }

        // ดึง UI แถบด้านล่างมาเตรียมแสดงข้อความ
        const bottomSheet = document.getElementById('bottomSheet');
        const sheetContent = document.getElementById('sheetContent');

        sheetContent.innerHTML = `<div style="text-align:center; padding: 20px;">กำลังค้นหาเส้นทาง... 🔍</div>`;
        bottomSheet.classList.add('show');

        try {
            let url = `http://localhost:8000/?q=${encodeURIComponent(goalInput)}`;
            
            if (startInput) {
                url += `&start=${encodeURIComponent('LC3_entry_' + startInput)}`; 
            }
            
            const response = await fetch(url);

            const data = await response.json();

            if (data.status === "success") {
                let html = `<div style="padding: 15px; max-height: 400px; overflow-y: auto;">`;
                html += `<h3 style="margin-bottom: 15px; color: #1a4d8c;">
                            <i class="fas fa-route"></i> เส้นทางไป ${data.search_result.target}
                         </h3>`;
                

                if (data.instructions && data.instructions.length > 0) {
                    html += `<ul style="list-style: none; padding: 0; margin: 0;">`;
                    data.instructions.forEach((inst, index) => {
                        let icon = "fa-arrow-up"; 
                        if (inst.action === "turn_left") icon = "fa-undo";
                        if (inst.action === "turn_right") icon = "fa-redo";
                        if (inst.action === "stairs_up" || inst.action === "stairs_down") icon = "fa-stairs";

                        html += `<li style="padding: 12px 0; border-bottom: 1px solid #f0f0f0; display: flex; align-items: center;">
                                    <span style="background: #1a4d8c; color: white; border-radius: 50%; width: 24px; height: 24px; display: inline-flex; justify-content: center; align-items: center; margin-right: 15px; font-size: 12px; flex-shrink: 0;">${index + 1}</span>
                                    <i class="fas ${icon}" style="color: #666; margin-right: 15px; width: 16px; text-align: center;"></i>
                                    <span style="font-size: 14px;">${inst.instruction}</span>
                                 </li>`;
                    });
                    html += `</ul>`;
                } else {
                    html += `<p style="text-align:center; color: #28a745;">คุณมาถึงจุดหมายแล้ว!</p>`;
                }
                html += `</div>`;
                
                sheetContent.innerHTML = html;
                console.log("✅ Route Nodes:", data.route);

            } else {
                sheetContent.innerHTML = `<div style="text-align:center; padding: 20px; color: #dc3545;">
                                            <i class="fas fa-exclamation-circle" style="font-size: 24px; margin-bottom: 10px;"></i><br>
                                            ${data.message || "ไม่พบเส้นทาง"}
                                          </div>`;
            }

        } catch (error) {
            console.error("API Error:", error);
            sheetContent.innerHTML = `<div style="text-align:center; padding: 20px; color: #dc3545;">
                                        <i class="fas fa-server" style="font-size: 24px; margin-bottom: 10px;"></i><br>
                                        ไม่สามารถเชื่อมต่อ Backend ได้<br>
                                        <small style="color: #666;">อย่าลืมรัน 'python gateway.py' ที่ Terminal ด้วยนะครับ</small>
                                      </div>`;
        }
    };

    let isMapLoaded = false;
    window.addEventListener('load', () => {
        if (!isMapLoaded) {
            isMapLoaded = true;
            initMap(); // คราวนี้มันจะมองเห็น initMap แล้ว!
        }
    })
});
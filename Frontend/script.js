const mockData = [
  { SearchTerm: "LC3-101", Detail: "ROOM", NodeID: "LC3_101", RoomNumber: "LC3-101", RoomName: "Lecture Room", Floor: "1", X: "46.3", Y: "24.5" },
  { SearchTerm: "LC3-102", Detail: "ROOM", NodeID: "LC3_102", RoomNumber: "LC3-102", RoomName: "Lecture Room", Floor: "1", X: "44.4", Y: "11.6" },
  { SearchTerm: "CS101 Sec 1", Detail: "COURSE", NodeID: "LC3_122", RoomNumber: "LC3-122", RoomName: "Lecture Room", Floor: "1", X: "32.2", Y: "54.3" },
  { SearchTerm: "Science Faculty Townhall", Detail: "EVENT", NodeID: "LC3_135/1", RoomNumber: "LC3-135/1", RoomName: "Event Room", Floor: "1", X: "40", Y: "50" }
];

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
    // ล็อคเป้าหมายเริ่มต้น (Initial Location & Navigation)
    // ==========================================
    function setInitialLocation(xPercent, yPercent, startZoom) {
        currentScale = startZoom;
        const targetPixelX = (xPercent / 100) * (mapImage.naturalWidth || 1000);
        const targetPixelY = (yPercent / 100) * (mapImage.naturalHeight || 800);
        
        // คำนวณให้จุดเป้าหมายอยู่กึ่งกลางหน้าจอ
        panX = (mapContainer.clientWidth / 2) - (targetPixelX * currentScale);
        panY = (mapContainer.clientHeight / 2) - (targetPixelY * currentScale);
        
        updateMapTransform();
        highlightRoom(xPercent, yPercent);
    }

    function initMap() {
        const minScale = getMinScale();
        const urlParams = new URLSearchParams(window.location.search);
        const currentLocationId = urlParams.get('loc_id');

        if (currentLocationId) {
            const locationData = mockData.find(item => item.NodeID === currentLocationId);
            if (locationData) {
                if (locationData.Floor !== document.querySelector('.floor-btn.active').getAttribute('data-floor')) {
                    document.querySelector(`.floor-btn[data-floor="${locationData.Floor}"]`).click();
                    return; 
                }
                setInitialLocation(parseFloat(locationData.X), parseFloat(locationData.Y), Math.max(minScale, 2.5));
            } else {
                setInitialLocation(50, 50, Math.max(minScale, 1.5));
            }
        } else {
            setInitialLocation(46.3, 24.5, Math.max(minScale, 1.8));
        }
    }

    if (mapImage.complete) initMap();
    else mapImage.onload = initMap;

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
        marker.style.top = y + '%';
        marker.style.left = x + '%';
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
});
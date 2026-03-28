const mockData = [
  {
    SearchTerm: "LC3-101",
    Detail: "ROOM",
    NodeID: "LC3_101",
    RoomNumber: "LC3-101",
    RoomName: "Lecture Room",
    Floor: "1",
    X: "46.3",
    Y: "24.5"
  },
  {
    SearchTerm: "LC3-102",
    Detail: "ROOM",
    NodeID: "LC3_102",
    RoomNumber: "LC3-102",
    RoomName: "Lecture Room",
    Floor: "1",
    X: "44.4",
    Y: "11.6"
  },
  {
    SearchTerm: "CS101 Sec 1",
    Detail: "COURSE",
    NodeID: "LC3_122",
    RoomNumber: "LC3-122",
    RoomName: "Lecture Room",
    Floor: "1",
    X: "32.2",
    Y: "54.3"
  },
  {
    SearchTerm: "Science Faculty Townhall",
    Detail: "EVENT",
    NodeID: "LC3_135/1",
    RoomNumber: "LC3-135/1",
    RoomName: "Event Room",
    Floor: "1",
    X: "40",
    Y: "50"
  }
];
//mochData คือตัวอย่าง database ที่ตอนนี้ยังเชื่อมไม่ได้

function debounce(func, delay) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), delay);
    };
}

document.addEventListener('DOMContentLoaded', function () {

    //===============================
    //DOM FIX (เลือก input ตัวที่ใช้งานจริง)
    //===============================

    const searchInputs = document.querySelectorAll('#searchInput');
    const searchInput = searchInputs[searchInputs.length - 1]; // เอาตัวล่างสุด

    const clearSearchBtn = document.getElementById('clearSearch');
    const searchTags = document.getElementById('searchTags');
    const bottomSheet = document.getElementById('bottomSheet');
    const sheetContent = document.getElementById('sheetContent');

    //===============================
    //ZOOM CONTROL
    //===============================
    let currentScale = 1;
    const mapImage = document.getElementById('mapImage');
    const zoomInBtn = document.getElementById('zoomIn');
    const zoomOutBtn = document.getElementById('zoomOut');

    zoomInBtn.addEventListener('click', () => {
        currentScale += 0.2;
        updateMapTransform();
    });

    zoomOutBtn.addEventListener('click', () => {
        if (currentScale > 0.5) {
            currentScale -= 0.2;
            updateMapTransform();
        }
    });

    function updateMapTransform() {
        mapImage.style.transform = `scale(${currentScale})`;
    }

    //===============================
    //FLOOR SWITCH
    //===============================
    const floorBtns = document.querySelectorAll('.floor-btn');

    floorBtns.forEach(btn => {
        btn.addEventListener('click', function () {
            floorBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');

            const selectedFloor = this.getAttribute('data-floor');

            mapImage.src = selectedFloor === '1'
                ? 'resources/LC3-MAP-1stFloor.png'
                : 'resources/LC3-MAP-2ndFloor.png';

            currentScale = 1;
            updateMapTransform();
        });
    });

    //===============================
    //LANGUAGE TOGGLE
    //===============================
    const langToggle = document.getElementById('langToggle');
    let isThai = true;

    langToggle.addEventListener('click', () => {
        isThai = !isThai;
        langToggle.innerText = isThai ? 'TH' : 'EN';

        const title = document.querySelector('.logo-text p');
        const tagLabel = document.querySelector('.tag-label');

        if (isThai) {
            title.innerText = 'ระบบนำทางในอาคารบร.3';
            searchInput.placeholder = 'ค้นหาห้องเรียน';
            tagLabel.innerText = 'แนะนำ:';
        } else {
            title.innerText = 'LC3 Building Navigation';
            searchInput.placeholder = 'Search rooms';
            tagLabel.innerText = 'Suggest:';
        }
    });

    //===============================
    //SEARCH SYSTEM
    //===============================

    searchInput.addEventListener('input', debounce(function () {
    const query = this.value.trim().toLowerCase();

    if (query.length > 0) {
        clearSearchBtn.style.display = 'block';
        searchTags.style.display = 'none';

        const results = mockData.filter(item =>
            item.SearchTerm.toLowerCase().includes(query)
        );

        showSearchResults(results);
    } else {
        closeBottomSheet();
    }
    }, 200));

    //===============================
    //SHOW RESULTS
    //===============================
    function showSearchResults(results) {
    if (!bottomSheet || !sheetContent) {
        console.log("❌ bottomSheet not found");
        return;
    }

    let html = `<div class="search-header">ผลลัพธ์</div>`;

    if (results.length === 0) {
        html += `<div class="result-item">ไม่พบข้อมูล</div>`;
    } else {
        results.forEach(item => {
            html += `
                <div class="result-item" onclick="selectRoom('${item.RoomNumber}', ${item.X}, ${item.Y})">
                    <b>${item.SearchTerm}</b><br>
                    <small>${item.RoomName}</small>
                </div>
            `;
        });
    }

    sheetContent.innerHTML = html;
    bottomSheet.classList.add('show');
    }

    //===============================
    //SELECT ROOM
    //===============================
    window.selectRoom = function(roomName, x, y) {
    searchInput.value = roomName;

    highlightRoom(x, y);
    navigateToRoom(x, y);

    sheetContent.innerHTML = `
        <div style="text-align:center;">
            <h3>ไป ${roomName}</h3>
            <p>กำลังนำทาง...</p>
        </div>
    `;
    }

    function navigateToRoom(x, y) {
    const map = document.getElementById('mapContainer');

    map.scrollTo({
        top: y * 5,
        left: x * 5,
        behavior: 'smooth'
    });
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

    document.getElementById('mapContainer').appendChild(marker);
    }

    function removeMarker() {
        const old = document.getElementById('marker');
        if (old) old.remove();
    }

    //===============================
    //CLEAR SEARCH
    //===============================
    clearSearchBtn.addEventListener('click', () => {
        closeBottomSheet();
        removeMarker();
    });

    //===============================
    //CLOSE SHEET
    //===============================
    function closeBottomSheet() {
        bottomSheet.classList.remove('show');
        searchInput.value = '';
        clearSearchBtn.style.display = 'none';
        searchTags.style.display = 'flex';

        setTimeout(() => {
            sheetContent.innerHTML = '';
        }, 300);
    }

});
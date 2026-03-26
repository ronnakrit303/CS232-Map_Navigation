// --- การจัดการ Zoom ---
let currentScale = 1;
const mapImage = document.getElementById('mapImage');
const zoomInBtn = document.getElementById('zoomIn');
const zoomOutBtn = document.getElementById('zoomOut');

zoomInBtn.addEventListener('click', () => {
    currentScale += 0.2;
    updateMapTransform();
});

zoomOutBtn.addEventListener('click', () => {
    if (currentScale > 0.5) { // ป้องกันไม่ให้ซูมออกมากเกินไป
        currentScale -= 0.2;
        updateMapTransform();
    }
});

function updateMapTransform() {
    mapImage.style.transform = `scale(${currentScale})`;
}


// --- การจัดการปุ่มเลือกชั้น ---
const floorBtns = document.querySelectorAll('.floor-btn');

floorBtns.forEach(btn => {
    btn.addEventListener('click', function() {
        // เอา class active ออกจากปุ่มอื่นทั้งหมด
        floorBtns.forEach(b => b.classList.remove('active'));
        // ใส่ class active ให้ปุ่มที่ถูกกด
        this.classList.add('active');

        const selectedFloor = this.getAttribute('data-floor');
        
        // ตรงนี้คุณสามารถเปลี่ยนรูปแผนที่ตามชั้นได้
        if(selectedFloor === '1') {
            mapImage.src = 'resources/LC3-MAP-1stFloor.png';
            console.log("เปลี่ยนเป็นแผนที่ชั้น 1");
        } else if (selectedFloor === '2') {
            mapImage.src = 'resources/LC3-MAP-2ndFloor.png';
            console.log("เปลี่ยนเป็นแผนที่ชั้น 2");
        }
        
        // รีเซ็ตการซูมเมื่อเปลี่ยนชั้น (ทางเลือก)
        currentScale = 1;
        updateMapTransform();
    });
});


// --- การจัดการเปลี่ยนภาษา ---
const langToggle = document.getElementById('langToggle');
let isThai = true;

langToggle.addEventListener('click', () => {
    isThai = !isThai;
    langToggle.innerText = isThai ? 'TH' : 'EN';
    
    // โค้ดสำหรับอัปเดต Text ในหน้าเว็บ
    const title = document.querySelector('.logo-text p');
    const searchInput = document.getElementById('searchInput');
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

// --- Mock ข้อมูลห้องเรียน ---
const roomDatabase = [
    "LC3-201", "LC3-202", "LC3-203", "LC3-204", 
    "LC3-213", "LC3-214", "LC3-215", "LC3-218"
];

// --- ตัวแปร DOM ---
const searchInput = document.getElementById('searchInput');
const clearSearchBtn = document.getElementById('clearSearch');
const searchTags = document.getElementById('searchTags');
const bottomSheet = document.getElementById('bottomSheet');
const sheetContent = document.getElementById('sheetContent');
const dragHandle = document.getElementById('dragHandle');

// --- 1. ระบบค้นหา (Search Logic) ---
searchInput.addEventListener('input', function() {
    const query = this.value.trim().toLowerCase();
    
    if (query.length > 0) {
        clearSearchBtn.style.display = 'block';
        searchTags.style.display = 'none'; // ซ่อน tag แนะนำ
        
        // กรองข้อมูลห้อง
        const results = roomDatabase.filter(room => room.toLowerCase().includes(query));
        showSearchResults(results);
    } else {
        closeBottomSheet();
    }
});

// ปุ่มกากบาทล้างการค้นหา
clearSearchBtn.addEventListener('click', closeBottomSheet);

// --- 2. ฟังก์ชันแสดง UI แต่ละ State ---

// State 1: แสดงผลลัพธ์การค้นหา
function showSearchResults(results) {
    let html = `<div class="search-header">ผลลัพธ์การค้นหา</div>`;
    
    if (results.length === 0) {
        html += `<div class="result-item" style="background:transparent;">ไม่พบห้องเรียนที่ค้นหา</div>`;
    } else {
        results.forEach(room => {
            html += `<div class="result-item" onclick="selectRoom('${room}')">ห้องเรียน ${room}</div>`;
        });
    }
    
    sheetContent.innerHTML = html;
    bottomSheet.classList.add('show');
}

// State 2 & 3: เลือกห้อง -> คำนวณ -> แสดงผล
function selectRoom(roomName) {
    // ซ่อนคีย์บอร์ดเมื่อกดเลือกห้อง
    searchInput.blur();
    searchInput.value = roomName;
    
    // แสดง State "กำลังคำนวณ"
    sheetContent.innerHTML = `
        <div class="calc-container">
            <div class="dest-box">
                <i class="fas fa-book-open" style="color:#0066cc;"></i>
                <span>จุดหมาย : ห้องเรียน ${roomName}</span>
            </div>
            <div class="calc-text">กำลังเตรียมเส้นทางที่ดีที่สุดให้คุณ...</div>
            <div class="progress-wrapper">
                <div class="progress-bar" id="progressBar"></div>
            </div>
            <div class="tip-text">💡 Tip: ขั้นตอนนี้อาจใช้เวลา 1-2 นาที</div>
        </div>
    `;
    
    // อนิเมชันหลอดโหลด
    setTimeout(() => {
        const bar = document.getElementById('progressBar');
        if(bar) bar.style.width = '100%';
    }, 100);

    // จำลองการคำนวณเสร็จใน 1.5 วินาที แล้วเปลี่ยนเป็น State "ผลลัพธ์"
    setTimeout(() => {
        showFinalResult(roomName);
    }, 1600);
}

// State 3: หน้าพร้อมเริ่มนำทาง
function showFinalResult(roomName) {
    sheetContent.innerHTML = `
        <div class="result-header">
            <div class="route-title">
                <i class="fas fa-arrow-up" style="color:#0066cc;"></i>
                เดินตรงไปตามทางเดิน
                <span class="route-dist">25 เมตร</span>
            </div>
            <div class="route-subtitle">มุ่งหน้าไปทางห้องเรียน ${roomName}</div>
        </div>
        <div class="route-stats">
            <span><i class="fas fa-shoe-prints"></i> 3 ขั้นตอน</span>
            <span><i class="far fa-clock"></i> ~2 นาที</span>
            <span><i class="fas fa-arrows-alt-h"></i> 125 เมตร</span>
        </div>
        <button class="start-nav-btn" onclick="alert('เริ่มนำทางไปยัง ${roomName}!')">เริ่มนำทาง</button>
        <div class="tip-text">💡 Tip: ปัดขึ้นเพื่อดูขั้นตอนการเดินทางทั้งหมด หรือแตะที่แท็บเพื่อขยาย</div>
    `;
}

// ฟังก์ชันปิดและล้างข้อมูล
function closeBottomSheet() {
    bottomSheet.classList.remove('show');
    searchInput.value = '';
    clearSearchBtn.style.display = 'none';
    searchTags.style.display = 'flex';
    
    // ล้างเนื้อหา sheet หลังอนิเมชันปิดเสร็จ
    setTimeout(() => {
        sheetContent.innerHTML = '';
    }, 300);
}


// --- 3. ระบบ Drag down (ปัดลงเพื่อปิด) ---
let startY = 0;
let currentY = 0;
let isDragging = false;

// รองรับทั้ง Touch (มือถือ) และ Mouse (คอมพิวเตอร์)
dragHandle.addEventListener('touchstart', dragStart, {passive: true});
dragHandle.addEventListener('touchmove', dragMove, {passive: false});
dragHandle.addEventListener('touchend', dragEnd);

dragHandle.addEventListener('mousedown', dragStart);
document.addEventListener('mousemove', dragMove);
document.addEventListener('mouseup', dragEnd);

function dragStart(e) {
    if(!bottomSheet.classList.contains('show')) return;
    startY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;
    isDragging = true;
    bottomSheet.style.transition = 'none'; // ปิด transition ชั่วคราวตอนลาก
}

function dragMove(e) {
    if (!isDragging) return;
    currentY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;
    let diffY = currentY - startY;
    
    // อนุญาตให้ลากลงได้อย่างเดียว (diffY > 0)
    if (diffY > 0) {
        e.preventDefault(); // ป้องกันการ scroll
        bottomSheet.style.transform = `translateY(${diffY}px)`;
    }
}

function dragEnd(e) {
    if (!isDragging) return;
    isDragging = false;
    bottomSheet.style.transition = 'transform 0.3s cubic-bezier(0.4, 0.0, 0.2, 1)'; // เปิด transition กลับ
    
    let diffY = currentY - startY;
    
    // ถ้าลากลงมามากกว่า 100px ให้ปิด Sheet ไปเลย
    if (diffY > 100) {
        closeBottomSheet();
        bottomSheet.style.transform = ''; // รีเซ็ต transform เพื่อให้ class .show จัดการต่อ
    } else {
        // เด้งกลับที่เดิม
        bottomSheet.style.transform = 'translateY(0)';
    }
}
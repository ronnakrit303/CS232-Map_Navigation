import qrcode
import os

# URL ไว้สำหรับสแกน
base_url = "https://indoor-nav.tu.ac.th/scan"

# รายชื่อจุดสแกนใน Pilot Zone(ตึก บร.3)
pilot_locations = [
    #Floor1 (LC3-1)
    {"id": "LC3-FL1-STAIR-01", "name": "จุดที่ 1: โถงบันไดกลาง ชั้น 1"},
    {"id": "LC3-FL1-RM114-02", "name": "จุดที่ 2: หน้าห้อง 114 ชั้น 1"},
    {"id": "LC3-FL1-RM101-03", "name": "จุดที่ 3: ข้างห้อง 101 ชั้น 1"},
    {"id": "LC3-FL1-RM128-04", "name": "จุดที่ 4: ข้างห้อง 128 ชั้น 1"},
    #Floor2 (LC3-2)
    {"id": "LC3-FL2-HALL-05", "name": "จุดที่ 5: โถงกลาง ชั้น 2"},
    {"id": "LC3-FL2-RM214-06", "name": "จุดที่ 6: หน้าห้อง 214 ชั้น 2"},
    {"id": "LC3-FL2-RM232-07", "name": "จุดที่ 7: หน้าห้อง 232 ชั้น 2"},
    {"id": "LC3-FL2-RM227-08", "name": "จุดที่ 8: หน้า่ห้อง 227 ชั้น 2"},
]

#สร้างโฟลเดอร์สำหรับเก็บไฟล์รูป
output_dir = "qr_outputs"
if not os.path.exists(output_dir):
    os.makedirs(output_dir)

print("--- กำลังเริ่มสร้าง QR Code ---")

for loc in pilot_locations:
    # นำ URL พื้นฐานมาต่อกับ loc_id
    full_url = f"{base_url}?loc_id={loc['id']}"
    
    # สร้าง QR Code (Error Correction ระดับ M เผื่อสติกเกอร์ถลอก)
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=10,
        border=4,
    )
    qr.add_data(full_url)
    qr.make(fit=True)

    img = qr.make_image(fill_color="black", back_color="white")
    
    # เซฟไฟล์โดยใช้ ID เป็นชื่อไฟล์
    file_path = os.path.join(output_dir, f"{loc['id']}.png")
    img.save(file_path)
    
    print(f" สร้างสำเร็จ: {file_path} (สำหรับจุด {loc['name']})")

print("\n เรียบร้อย ไฟล์รูปอยู่ในโฟลเดอร์ 'qr_outputs'")
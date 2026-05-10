# CONTRIBUTION.md

## Project Information

**Project:** ระบบนำทางภายในอาคารคณะวิทยาศาสตร์ บร.3 (LC3-Navigator)  
**Course:** CS232 Introduction to Cloud Computing Technology  
**Group:** กลุ่มที่ 2 — อยู่บนเมฆ  
**GitHub Repository:** https://github.com/ronnakrit303/CS232-Map_Navigation  
**Trello Board:** https://trello.com/b/wB1GFvrX/sprint-planningnavigationsystem  
**Demo Video:** https://youtu.be/rEuHJohwmZE

เอกสารนี้สรุป contribution ของสมาชิกโดยอ้างอิงจาก **การ์ดที่อยู่ในช่อง Done (Task) ของ Trello** เป็นหลักเนื่องจากทีมใช้ Trello เป็น task board หลักในการแบ่งงาน ติดตามสถานะ และเก็บ artifact ของงานแต่ละส่วน

---

## Team Members

| Trello Name | ชื่อ-นามสกุล | รหัสนักศึกษา |
|---|---|---|
| Chanakarn Khongratchatapinyo | นายชนกานต์ คงรัชตภิญโญ | 6709650235 |
| Paponpat Meevon | นายปพนพัชร์ มีวน | 6709650458 |
| danny psx_ (danny.psx) | นายพลธรรม ศรีงาม | 6709650508 |
| purinat wanthanathanya | นายภูริณัฐ วรรธนะธัญญา | 6709650565 |
| ronnakrit woralakpakdee | นายรณกฤต วรลักษณ์ภักดี | 6709650607 |
| Wuttikorn | นายวุฒิกร บุญทวี | 6709650623 |
| supavit maijasturath | นายศุภวิชญ์ ไม้จัตุรัส | 6709650656 |
| Suttipoch Suwanasut | นายสุทธิพจน์ สุวรรณสุทธิ์ | 6709650698 |

---

## Contribution by Trello Done (Task)

### GLOBAL Tasks

| Task | Members in Trello Card | Contribution Summary |
|---|---|---|
| Task1: GLOBAL: (Requirement Analysis) -> User Story Breakdown | Paponpat Meevon, Chanakarn Khongratchatapinyo, danny psx_, purinat wanthanathanya, ronnakrit woralakpakdee, Wuttikorn, supavit maijasturath, Suttipoch Suwanasut | วิเคราะห์ requirement, แตก user stories และกำหนดภาพรวมของ feature ที่ระบบต้องรองรับ |
| Task2: GLOBAL: (Development Environment) -> Setup Project และสร้าง Git Repository | Paponpat Meevon, ronnakrit woralakpakdee | วางโครง project, repository, branch strategy และเตรียมพื้นฐานสำหรับการพัฒนาร่วมกัน |
| Task3: GLOBAL: (System Design) -> ออกแบบ AWS Serverless Architecture | Paponpat Meevon | ออกแบบสถาปัตยกรรม AWS Serverless Architecture และจัดทำ architecture diagram |
| Task4: GLOBAL: (Development Environment) -> Setup AWS Environment | Paponpat Meevon | ตั้งค่า AWS environment เช่น S3 buckets, API Gateway endpoints, Lambda functions, DynamoDB และ CI/CD staging environment |
| Task5: GLOBAL: (System Design) -> ออกแบบ JSON Schema ผังอาคาร | Paponpat Meevon | ออกแบบรูปแบบข้อมูล JSON สำหรับ node, edge, floor, stairs และข้อมูลที่รองรับ pathfinding |
| Task6: GLOBAL: (Tool Development) -> สร้าง Floor Plan Editor Tool | Paponpat Meevon, ronnakrit woralakpakdee | สร้างเครื่องมือช่วยจัดการ floor plan / node / edge และ export ข้อมูลที่นำไปใช้ต่อกับ graph config |
| Task7: GLOBAL: (Data Collection) -> สำรวจ บร.3 และสร้าง Config (pilot zone) | Paponpat Meevon, Chanakarn Khongratchatapinyo, ronnakrit woralakpakdee, supavit maijasturath | สำรวจพื้นที่จริงของอาคาร บร.3 ใน pilot zone และจัดทำข้อมูล config ชุดแรกสำหรับทดสอบระบบ |

---

### US1: Core Search, Map และ Navigation Flow

| Task | Members in Trello Card | Contribution Summary |
|---|---|---|
| Task1: US1: (Frontend Design) -> ออกแบบ UI - Search Page (Figma) | danny psx_ | ออกแบบหน้า Search Page ใน Figma รวมถึง layout, search box และ mobile view |
| Task2: US1: (Frontend Design) -> ออกแบบ UI - Map View Page (Figma) | danny psx_, supavit maijasturath, Suttipoch Suwanasut | ออกแบบหน้า Map View Page เช่น map area, path display, start/end interaction และ mobile layout |
| Task3: US1: (Backend) -> สร้าง Pathfinding Algorithm (Lambda) | ronnakrit woralakpakdee | พัฒนา logic pathfinding และ Lambda สำหรับคำนวณเส้นทางจาก graph JSON |
| Task4: US1: (Frontend) -> สร้าง Search UI ค้นหาเลขห้อง | Paponpat Meevon, Suttipoch Suwanasut | พัฒนา UI สำหรับค้นหาเลขห้อง เช่น search box, autocomplete และผลลัพธ์การค้นหา |
| Task5: US1: (Frontend) -> สร้าง Map View Page | danny psx_, supavit maijasturath, Suttipoch Suwanasut | implement หน้าแผนที่ แสดง floor plan และ component สำหรับการแสดงผลตำแหน่ง/เส้นทาง |
| Task6: US1: (Frontend) -> สร้าง Navigation View พื้นฐาน | danny psx_, supavit maijasturath, Suttipoch Suwanasut | สร้างหน้า navigation view สำหรับแสดงเส้นทางจาก start ไป end และรองรับการใช้งานบน mobile |
| Task7: US1: (Integration) -> เชื่อม Search -> Pathfinding -> Navigation | Wuttikorn | เชื่อม flow ระหว่าง search, pathfinding และ navigation view เพื่อทดสอบ end-to-end flow |

---

### US2: Search รองรับชื่อห้อง

| Task | Members in Trello Card | Contribution Summary |
|---|---|---|
| Task1: US2: (Frontend) -> เพิ่ม Search รองรับชื่อห้อง | Chanakarn Khongratchatapinyo, supavit maijasturath, Suttipoch Suwanasut | เพิ่มความสามารถในการค้นหาด้วยชื่อห้อง/ห้องปฏิบัติการ และปรับผลลัพธ์ให้เชื่อมกับห้องปลายทาง |

---

### US3: Search รองรับรายวิชาและ Section

| Task | Members in Trello Card | Contribution Summary |
|---|---|---|
| Task1: US3: (Data) -> จัดทำ Config mapping วิชา และ sec -> ห้อง (DynamoDB) | Chanakarn Khongratchatapinyo | จัดทำข้อมูล mapping รายวิชาและ section ไปยังห้องเรียน และเตรียมข้อมูลสำหรับ DynamoDB search index |
| Task2: US3: (Frontend) -> เพิ่ม Search รองรับวิชา และ sec | Paponpat Meevon, Suttipoch Suwanasut | ปรับ frontend search ให้รองรับการค้นหาด้วยรายวิชา/section และเชื่อมข้อมูลกับผลลัพธ์ห้องปลายทาง |

---

### US4: Search รองรับ Event

| Task | Members in Trello Card | Contribution Summary |
|---|---|---|
| Task1: US4: (Data) -> จัดทำ Config mapping event -> ห้อง (DynamoDB) | Chanakarn Khongratchatapinyo | จัดทำข้อมูล mapping event ไปยังห้องหรือสถานที่จัดกิจกรรม และเตรียมข้อมูลสำหรับ DynamoDB |
| Task2: US4: (Frontend) -> เพิ่ม Search รองรับชื่อ Event | Paponpat Meevon, Suttipoch Suwanasut | เพิ่มความสามารถในการค้นหาชื่อ event และเชื่อมผลลัพธ์ไปยังตำแหน่ง/ห้องที่เกี่ยวข้อง |

---

### US5: Direction และ Step-by-step Navigation

| Task | Members in Trello Card | Contribution Summary |
|---|---|---|
| Task1: US5: (Frontend Design) -> ออกแบบ UI - Step-by-step และลูกศร (Figma) | danny psx_, Suttipoch Suwanasut | ออกแบบ UI สำหรับการนำทางแบบ step-by-step, ลูกศรทิศทาง และ state ต่าง ๆ ของหน้า navigation |
| Task2: US5: (Backend) -> สร้าง Direction Instruction Generator (Lambda) | ronnakrit woralakpakdee | พัฒนา Lambda สำหรับแปลง path เป็น instruction รายละเอียดการเดินทาง เช่น เลี้ยวซ้าย/ขวา ระยะทาง และทิศทาง |
| Task3: US5: (Frontend) -> สร้าง Navigation UI | danny psx_, supavit maijasturath, Suttipoch Suwanasut | implement UI สำหรับแสดง instruction, รายละเอียดการเดินทาง และเส้นทางจาก start ไป end |
| Task4: US5: (Integration) -> เชื่อม Instruction Generator -> Step UI | Wuttikorn | เชื่อมผลลัพธ์จาก Direction Instruction Generator เข้ากับ Step UI และทดสอบ flow การนำทาง |

---

### US6: Admin Config และ Guide

| Task | Members in Trello Card | Contribution Summary |
|---|---|---|
| Task1: US6: (System Design) -> ออกแบบ Config Format และเขียนคู่มือ Admin | Paponpat Meevon | ออกแบบ config format, จัดทำ Admin Guide ในรูปแบบ Markdown/HTML/PDF และเชื่อมกับแนวทาง deploy config ผ่าน CI/CD |

---

### US7: QR Landing

| Task | Members in Trello Card | Contribution Summary |
|---|---|---|
| Task1: US7: (Frontend Design) -> ออกแบบ UI - QR Landing (Figma) | purinat wanthanathanya | ออกแบบ flow หน้า QR Landing ใน Figma เช่น scan QR แล้วระบุตำแหน่งเริ่มต้น |
| Task2: US7: (Backend) -> สร้าง QR Code Generator | purinat wanthanathanya | สร้าง QR code สำหรับจุดต่าง ๆ ใน pilot zone และเตรียม QR image set สำหรับใช้งานจริง |
| Task3: US7: (Frontend) -> สร้าง QR Landing Page | Chanakarn Khongratchatapinyo, purinat wanthanathanya | พัฒนา/เชื่อมหน้า QR Landing Page เพื่อให้เมื่อ scan QR แล้วระบบแสดงตำแหน่งจุดเริ่มต้นและเข้าสู่ flow การค้นหา/นำทางได้ |

---

## Evidence Sources

| Evidence | Link / Location |
|---|---|
| Trello task board | https://trello.com/b/wB1GFvrX/sprint-planningnavigationsystem |
| GitHub Repository | https://github.com/ronnakrit303/CS232-Map_Navigation |
| Demo Video | https://youtu.be/rEuHJohwmZE |
| Teamwork Evidence | `evidence/Teamwork_Evidence_G2.pdf` |
| Teamwork Evidence Phase 2 | `evidence/Teamwork_Evidence_Phase2_G2.pdf` |
| Architecture Diagram | `architecture/serverless-architecture.png` |

## Note

ทีมใช้ Trello เป็น task board หลักแทน GitHub Issues โดย Trello แสดงการแบ่งงาน ความคืบหน้า สมาชิกที่รับผิดชอบ และ artifact ที่แนบไว้ในการ์ดแต่ละใบ ส่วน GitHub ใช้เป็น repository สำหรับรวม source code, config, documentation และ deployment artifacts ของระบบ
> **หมายเหตุ:** จากการแบ่งงานตาม Card ใน Trello นี้ อ้างอิงการทำงานของทีมได้ในส่วนใหญ่ แต่ไม่ทั้งหมด เพราะทีมใช้ระบบการทำงานแบบที่เมื่อสมาชิกในทีมคนไหนทำงานของส่วนของตัวเองเสร็จแล้ว ก็สามารถไปช่วยงานของเพื่อนคนอื่นต่อได้

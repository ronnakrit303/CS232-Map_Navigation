# SETUP_SUMMARY.md

## Setup Summary ของระบบ LC3-Navigator

เอกสารนี้สรุปการ setup ระบบในระดับ repository และ AWS resources ที่เกี่ยวข้องกับการทำงานของ LC3-Navigator

## Repository Structure ที่เกี่ยวข้อง

| Path | หน้าที่ |
|---|---|
| `Frontend/` | เก็บ frontend static website เช่น HTML, CSS, JavaScript และ resources |
| `Backend/lambdas/search/` | Lambda สำหรับค้นหาข้อมูลจาก DynamoDB |
| `Backend/lambdas/pathfinding/` | Lambda สำหรับคำนวณเส้นทางจาก graph config |
| `Backend/lambdas/direction/` | Lambda สำหรับสร้าง direction / instruction |
| `Database/graph.json` | ข้อมูล graph ของอาคาร เช่น node และ edge |
| `Database/search_metadata.json` | ข้อมูล mapping สำหรับ search เช่น วิชา event และห้อง |
| `Database/seed_data.py` | script สำหรับ seed ข้อมูลลง DynamoDB |
| `.github/workflows/deploy-staging.yml` | GitHub Actions workflow สำหรับ deploy staging environment |
| `docs/` | เอกสารประกอบ เช่น Admin Guide และ config reference |

## AWS Resources

| Resource | Name / Path | หน้าที่ |
|---|---|---|
| S3 Static Website Bucket | `lc3-navigator-static-staging` | host frontend static website |
| S3 Config Bucket | `lc3-navigator-config-staging` | เก็บ config และ floor plan resources |
| DynamoDB Table | `LC3_CourseMapping_staging` | เก็บ search index สำหรับห้อง วิชา event และจุดสำคัญ |
| Search Lambda | `lc3-search-staging` | ค้นหาข้อมูลจาก DynamoDB |
| Pathfinding Lambda | `lc3-pathfinding-staging` | คำนวณเส้นทางจาก graph JSON |
| Direction Lambda | `lc3-direction-staging` | สร้าง instruction สำหรับ navigation UI |
| API Gateway | staging REST API | รับ request จาก frontend แล้วเรียก Lambda |

## CI/CD Setup

ระบบใช้ GitHub Actions ในการ deploy แบบอัตโนมัติ โดย workflow ทำงานเมื่อมีการ push เข้า branch `dev`

ขั้นตอนหลักของ workflow คือ

1. ตรวจสอบ JSON config
2. upload config ไปยัง S3 Config Bucket
3. seed ข้อมูลลง DynamoDB
4. sync frontend ไปยัง S3 Static Website Bucket
5. deploy Lambda functions
6. update environment variables และ `CONFIG_VERSION`

## Environment Variables หลักของ Lambda

| Function | Environment Variables |
|---|---|
| `lc3-search-staging` | `DDB_TABLE=LC3_CourseMapping_staging` |
| `lc3-pathfinding-staging` | `GRAPH_S3_BUCKET=lc3-navigator-config-staging`, `GRAPH_S3_KEY=graph/graph.json` |
| `lc3-direction-staging` | `GRAPH_S3_BUCKET=lc3-navigator-config-staging`, `GRAPH_S3_KEY=graph/graph.json` |

## Setup Evidence

หลักฐานการ setup ระบบและการ deploy สามารถดูได้จาก

- Trello cards ในกลุ่ม GLOBAL และ US tasks
- GitHub repository: https://github.com/ronnakrit303/CS232-Map_Navigation
- Teamwork evidence PDFs ใน folder `evidence/`
- Architecture diagram ใน folder `architecture/`

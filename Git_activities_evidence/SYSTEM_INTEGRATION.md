# SYSTEM_INTEGRATION.md

## ภาพรวมการเชื่อมต่อของระบบ

LC3-Navigator เป็นระบบเว็บนำทางภายในอาคารที่ออกแบบด้วย AWS Serverless Architecture โดยส่วนประกอบหลักเชื่อมกันเป็น flow ดังนี้

```text
User Browser
  -> Amazon S3 Static Website
  -> API Gateway
  -> AWS Lambda
  -> DynamoDB / S3 Config Bucket
  -> API Gateway
  -> Frontend แสดงผลบนแผนผัง
```

## Web -> API

Frontend ถูก host บน Amazon S3 Static Website Bucket และเรียก backend ผ่าน API Gateway endpoint เช่น

- search endpoint สำหรับค้นหาห้อง วิชา event หรือจุดสำคัญ
- route endpoint สำหรับหาเส้นทางจาก start ไป end
- direction endpoint สำหรับสร้างคำแนะนำการเดินทางแบบ step-by-step

## API -> Lambda

API Gateway ทำหน้าที่รับ HTTP request จาก browser แล้ว route request ไปยัง Lambda function ตาม endpoint ที่เกี่ยวข้อง

| Lambda Function | หน้าที่ |
|---|---|
| `lc3-search-staging` | ค้นหาข้อมูลห้อง วิชา event และจุดสำคัญจาก DynamoDB |
| `lc3-pathfinding-staging` | คำนวณเส้นทางจาก start node ไปยัง end node โดยใช้ graph config |
| `lc3-direction-staging` | แปลง path เป็น instruction / direction สำหรับแสดงใน frontend |

## Lambda -> Database / Config

ระบบใช้ข้อมูล 2 แหล่งหลัก

| Data Source | หน้าที่ |
|---|---|
| DynamoDB: `LC3_CourseMapping_staging` | เก็บ search index สำหรับห้อง วิชา event และจุดสำคัญภายในอาคาร |
| S3 Config Bucket: `lc3-navigator-config-staging` | เก็บ `graph.json`, `search_metadata.json` และ floor plan resources |

Search Lambda ใช้ DynamoDB สำหรับค้นหาข้อมูล ส่วน Pathfinding และ Direction Lambda ใช้ graph config จาก S3 เพื่อคำนวณเส้นทางและสร้างคำแนะนำการเดินทาง

## Deployment Integration

GitHub Actions ทำหน้าที่เป็น CI/CD pipeline เมื่อมีการ push เข้า branch `dev` โดยทำงานหลัก ๆ ดังนี้

1. Validate config files เช่น `graph.json` และ `search_metadata.json`
2. Upload config ไปยัง S3 Config Bucket
3. Seed ข้อมูล search index ลง DynamoDB
4. Deploy frontend ไปยัง S3 Static Website Bucket
5. Deploy Lambda functions
6. Update `CONFIG_VERSION` เพื่อให้ Lambda ใช้ config ล่าสุด

การเชื่อมต่อส่วนนี้ทำให้ระบบรองรับการอัปเดต config และ deploy อัตโนมัติ โดยลดการแก้ไข manual บน AWS Console

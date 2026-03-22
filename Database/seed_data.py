import boto3

# เชื่อมต่อกับ DynamoDB
dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
table = dynamodb.Table('LC3_SIW_CourseMapping')

# รายชื่อห้องทั้งหมด 42 ห้อง (ใส่แค่เลขไว้เหมือนเดิม โค้ดจะจัดการต่อให้เอง)
rooms = [
    "101", "101/1", "101/2", "102/1", "102/2", "103", "104", "104/1", "105", "106", "107",
    "108", "108/1", "109", "110", "111", "112", "113", "114", "115", "116", "117", "118",
    "118/1", "119", "119/1", "119/2", "119/3", "119/4", "119/5", "120", "121", "121/1",
    "121/2", "121/3", "122", "122/1", "122/2", "122/3", "122/4", "122/5", "122/6"
]

print("Start up some firework...")

# ใช้ batch_writer เพื่อยิงข้อมูลรวดเดียวจบ
with table.batch_writer() as batch:
    for room in rooms:
        # ✨ พระเอกอยู่ตรงนี้: สั่งเติม LC3- เข้าไปข้างหน้าเลขห้องอัตโนมัติ
        full_room_name = f"LC3-{room}" 
        
        batch.put_item(
            Item={
                'SearchTerm': full_room_name,   # ผลลัพธ์จะเป็น LC3-101
                'Detail': 'ROOM',
                'RoomNumber': full_room_name,   # ผลลัพธ์จะเป็น LC3-101
                'RoomName': 'Lecture Room'
            }
        )

print("✅ ยัดข้อมูล 42 ห้อง (พร้อมเติม LC3-) ลงตารางเรียบร้อยแล้วนาย!")
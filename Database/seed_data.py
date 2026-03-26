import boto3

# เชื่อมต่อกับ DynamoDB
dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
table = dynamodb.Table('LC3_SIW_CourseMapping')

#1. รายชื่อห้องทั้งหมด 74 ห้อง พร้อมฟังก์ชันการใช้งาน
ROOM_NAMES = {
    "101": "Faculty Offices (Mathematics and Statistics)", "101/1": "Graduate Seminar Room", "101/2": "Lecture Room",
    "102/1": "Lecture Room", "102/2": "Lecture Room", "103": "Lecture Room", "104": "Lecture Room",
    "104/1": "Graduate Common Room (Environmental Science)", "105": "Lecture Room", "106": "Lecture Room",
    "107": "Lecture Room", "108": "Lecture Room", "108/1": "Staff Room", "109": "Lecture Room",
    "110": "Lecture Room", "111": "Lecture Room", "112": "Restroom", "113": "Restroom", "114": "Restroom",
    "115": "Seminar in Mathematics and Statistics Room", "116": "Lecture Room", "117": "Lecture Room",
    "118": "Lecture Room", "118/1": "Lecture Room", "119": "Faculty Offices (Mathematics and Statistics)",
    "119/1": "Faculty Offices (Mathematics and Statistics)", "119/2": "Faculty Offices (Mathematics and Statistics)",
    "119/3": "Faculty Offices (Mathematics and Statistics)", "119/4": "Faculty Offices (Mathematics and Statistics)",
    "119/5": "Faculty Offices (Mathematics and Statistics)", "120": "Storage Room", "121": "Lecture Room",
    "121/1": "Faculty Offices (Mathematics and Statistics)", "121/2": "Faculty Offices (Mathematics and Statistics)",
    "121/3": "Faculty Offices (Mathematics and Statistics)", "121/4": "Statistical Consulting for Research Service Room",
    "121/5": "Faculty Offices (Mathematics and Statistics)", "122": "Lecture Room", "122/1": "Staff Room",
    "122/2": "Faculty Offices (Mathematics and Statistics)", "122/3": "Faculty Offices (Mathematics and Statistics)",
    "122/4": "Faculty Offices (Mathematics and Statistics)", "122/5": "Faculty Offices (Mathematics and Statistics)",
    "122/6": "Faculty Offices (Mathematics and Statistics)", "123": "Faculty Offices (Mathematics and Statistics)",
    "123/1": "Faculty Offices (Mathematics and Statistics)", "124/1": "Plasma and Nuclear Fusion Lab",
    "124/2": "Plasma and Nuclear Fusion Lab", "125": "Storage Room", "125/1": "Storage Room",
    "126": "Faculty of Science and Technology Student Affairs Office", "127": "Faculty Offices (Mathematics and Statistics)",
    "128": "Electronic Lab", "129": "Electronic Lab", "130": "Storage Room", "131": "Storage Room",
    "132": "Electricity Control Room", "133": "Restroom", "134": "Restroom", "135/1": "Faculty Offices (Physics)",
    "135/2": "Faculty Offices (Physics)", "135/3": "Faculty Offices (Physics)",
    "136": "Faculty Offices (Mathematics and Statistics)", "136/1": "Faculty Offices (Mathematics and Statistics)",
    "136/2": "Faculty Offices (Mathematics and Statistics)", "136/3": "Faculty Offices (Mathematics and Statistics)",
    "136/4": "Faculty Offices (Mathematics and Statistics)", "137/1": "Physics Lab", "137/2": "Physics Lab",
    "137/3": "Physics Lab", "138": "Faculty Offices (Mathematics and Statistics)", "139": "Physics Lab",
    "140": "Electronic Lab", "141": "Electronic Lab"
}

#2. ข้อมูลพิกัด
ALL_NODES = [
    {"id": "LC3_hallway-1", "name": "hallway-1", "floor": 1, "x": 18, "y": 16.9, "type": "junction"},
    {"id": "LC3_hallway-2", "name": "hallway-2", "floor": 1, "x": 51.2, "y": 16.3, "type": "junction"},
    {"id": "LC3_hallway-3", "name": "hallway-3", "floor": 1, "x": 49.9, "y": 30.9, "type": "junction"},
    {"id": "LC3_hallway-4", "name": "hallway-4", "floor": 1, "x": 53.7, "y": 31.3, "type": "junction"},
    {"id": "LC3_stair-2", "name": "stair-2", "floor": 1, "x": 51.7, "y": 34.6, "type": "stairs"},
    {"id": "LC3_stair-1", "name": "stair-1", "floor": 1, "x": 16.7, "y": 39.9, "type": "stairs"},
    {"id": "LC3_hallway-5", "name": "hallway-5", "floor": 1, "x": 52.3, "y": 36.8, "type": "junction"},
    {"id": "LC3_hallway-6", "name": "hallway-6", "floor": 1, "x": 52.5, "y": 57.6, "type": "junction"},
    {"id": "LC3_hallway-7", "name": "hallway-7", "floor": 1, "x": 17.9, "y": 58.2, "type": "junction"},
    {"id": "LC3_hallway-8", "name": "hallway-8", "floor": 1, "x": 18.1, "y": 42.6, "type": "junction"},
    {"id": "LC3_hallway-9", "name": "hallway-9", "floor": 1, "x": 15.2, "y": 41.4, "type": "junction"},
    {"id": "LC3_109", "name": "109", "floor": 1, "x": 12.8, "y": 11.8, "type": "room"},
    {"id": "LC3_110", "name": "110", "floor": 1, "x": 12.7, "y": 19.1, "type": "room"},
    {"id": "LC3_111", "name": "111", "floor": 1, "x": 12.8, "y": 26.4, "type": "room"},
    {"id": "LC3_115", "name": "115", "floor": 1, "x": 12.1, "y": 49.6, "type": "room"},
    {"id": "LC3_116", "name": "116", "floor": 1, "x": 12.6, "y": 55.6, "type": "room"},
    {"id": "LC3_117", "name": "117", "floor": 1, "x": 13.2, "y": 62.7, "type": "room"},
    {"id": "LC3_118", "name": "118", "floor": 1, "x": 19.6, "y": 63.3, "type": "room"},
    {"id": "LC3_118/1", "name": "118/1", "floor": 1, "x": 25.2, "y": 63, "type": "room"},
    {"id": "LC3_120", "name": "120", "floor": 1, "x": 28.7, "y": 63, "type": "room"},
    {"id": "LC3_121", "name": "121", "floor": 1, "x": 35.6, "y": 62.6, "type": "room"},
    {"id": "LC3_121/1", "name": "121/1", "floor": 1, "x": 40.5, "y": 64.1, "type": "room"},
    {"id": "LC3_121/2", "name": "121/2", "floor": 1, "x": 42, "y": 60.4, "type": "room"},
    {"id": "LC3_121/3", "name": "121/3", "floor": 1, "x": 43.8, "y": 64.8, "type": "room"},
    {"id": "LC3_108/1", "name": "108/1", "floor": 1, "x": 16.6, "y": 10.5, "type": "room"},
    {"id": "LC3_108", "name": "108", "floor": 1, "x": 19.8, "y": 12, "type": "room"},
    {"id": "LC3_106", "name": "106", "floor": 1, "x": 24.3, "y": 11.6, "type": "room"},
    {"id": "LC3_104/1", "name": "104/1", "floor": 1, "x": 28.3, "y": 11.8, "type": "room"},
    {"id": "LC3_104", "name": "104", "floor": 1, "x": 32.4, "y": 11.6, "type": "room"},
    {"id": "LC3_103", "name": "103", "floor": 1, "x": 38.5, "y": 11.3, "type": "room"},
    {"id": "LC3_102/2", "name": "102/2", "floor": 1, "x": 41.1, "y": 13.6, "type": "room"},
    {"id": "LC3_102/1", "name": "102/1", "floor": 1, "x": 44.4, "y": 11.6, "type": "room"},
    {"id": "LC3_107", "name": "107", "floor": 1, "x": 23.5, "y": 20.2, "type": "room"},
    {"id": "LC3_105", "name": "105", "floor": 1, "x": 27.9, "y": 20.2, "type": "room"},
    {"id": "LC3_101/1", "name": "101/1", "floor": 1, "x": 32.2, "y": 21, "type": "room"},
    {"id": "LC3_101/2", "name": "101/2", "floor": 1, "x": 35.8, "y": 20.2, "type": "room"},
    {"id": "LC3_101", "name": "101", "floor": 1, "x": 44.8, "y": 30.1, "type": "room"},
    {"id": "LC3_119", "name": "119", "floor": 1, "x": 20.5, "y": 54.9, "type": "room"},
    {"id": "LC3_119/1", "name": "119/1", "floor": 1, "x": 21.9, "y": 54.6, "type": "room"}, # แก้ 1119/1 ให้แล้วนะคะ
    {"id": "LC3_119/2", "name": "119/2", "floor": 1, "x": 23.9, "y": 55.1, "type": "room"},
    {"id": "LC3_119/3", "name": "119/3", "floor": 1, "x": 25.8, "y": 54.4, "type": "room"},
    {"id": "LC3_119/4", "name": "119/4", "floor": 1, "x": 27.3, "y": 55.3, "type": "room"},
    {"id": "LC3_119/5", "name": "119/5", "floor": 1, "x": 29.1, "y": 54.9, "type": "room"},
    {"id": "LC3_122", "name": "122", "floor": 1, "x": 34.2, "y": 54.9, "type": "room"},
    {"id": "LC3_122/1", "name": "122/1", "floor": 1, "x": 41.1, "y": 53.7, "type": "room"},
    {"id": "LC3_122/2", "name": "122/2", "floor": 1, "x": 42, "y": 56.2, "type": "room"},
    {"id": "LC3_122/3", "name": "122/3", "floor": 1, "x": 43.4, "y": 53.9, "type": "room"},
    {"id": "LC3_122/4", "name": "122/4", "floor": 1, "x": 46, "y": 53.3, "type": "room"},
    {"id": "LC3_122/5", "name": "122/5", "floor": 1, "x": 47.4, "y": 56.6, "type": "room"},
    {"id": "LC3_122/6", "name": "122/6", "floor": 1, "x": 48.8, "y": 53.9, "type": "room"},
    
    #ข้อมูลทางเดินโซนขวา 
    {"id": "LC3_hallway-10", "name": "hallway-10", "floor": 1, "x": 70.5, "y": 16.5, "type": "junction"},
    {"id": "LC3_hallway-11", "name": "hallway-11", "floor": 1, "x": 70.5, "y": 35.0, "type": "junction"},
    {"id": "LC3_hallway-12", "name": "hallway-12", "floor": 1, "x": 70.5, "y": 55.0, "type": "junction"}
]

#สร้างตัวค้นหาพิกัด
node_lookup = { node["name"]: node for node in ALL_NODES }

print("Start up some firework... กำลังยัดข้อมูล 74 ห้อง และทางเดินเข้า DynamoDB!")

#ใช้ batch_writer เพื่อยิงข้อมูล
with table.batch_writer() as batch:
    
    #ข้อมูลห้องทั้ง 74 ห้อง
    for room_num, room_name in ROOM_NAMES.items():
        full_room_name = f"LC3-{room_num}"
        
        #ถ้าห้องไหนมีพิกัดแล้ว ก็ดึงมาใช้ ถ้ายังไม่มีให้เป็น 0.0 ไปก่อน
        if room_num in node_lookup and node_lookup[room_num]["type"] == "room":
            x_val = str(node_lookup[room_num]["x"])
            y_val = str(node_lookup[room_num]["y"])
            node_id = node_lookup[room_num]["id"]
        else:
            x_val = "0.0"
            y_val = "0.0"
            node_id = f"LC3_{room_num}"

        item = {
            'SearchTerm': full_room_name, 
            'Detail': 'ROOM',
            'NodeID': node_id,
            'RoomNumber': full_room_name,
            'RoomName': room_name,
            'Floor': '1',
            'X': x_val,
            'Y': y_val,
            'NodeType': 'room'
        }
        batch.put_item(Item=item)
        
    #ยัดข้อมูลทางเดินและบันได (Junctions & Stairs)
    for node in ALL_NODES:
        if node["type"] != "room":
            item = {
                'SearchTerm': node["id"], 
                'Detail': 'NODE',
                'NodeID': node['id'],
                'RoomNumber': node["name"],
                'RoomName': node["type"].capitalize(),
                'Floor': str(node['floor']),
                'X': str(node['x']),
                'Y': str(node['y']),
                'NodeType': node['type']
            }
            batch.put_item(Item=item)

print("ดันข้อมูลห้องและ Node ทั้งหมดลงตารางเรียบร้อย")
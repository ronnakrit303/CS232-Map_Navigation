import boto3

dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
table = dynamodb.Table('LC3_SIW_CourseMapping')

ROOM_NAMES = {
    "101": "Faculty Offices (Mathematics and Statistics)", "101/1": "Lecture Room 4 (Environmental Science)", "101/2": "Graduate Seminar Room (Mathematics and Statistics)",
    "102/1": "Graduate Seminar Room (Mathematics and Statistics)", "102/2": "Graduate Seminar Room (Mathematics and Statistics)", "103": "Lecture Room", "104": "Lecture Room",
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

COURSES = {
    "ENV101 Sec 1": "101/2", "ENV102 Sec 1": "102/1", "ENV205 Sec 2": "102/2",
    "ENV301 Sec 1": "103", "CHM101 Sec 3": "104", "ENV402 Sec 1": "105",
    "MTH101 Sec 2": "106", "STA201 Sec 1": "107", "PHY101 Sec 4": "108",
    "CS265 Sec 1": "109", "CS251 Sec 2": "110", "CS262 Sec 1": "111",
    "MTH202 Sec 1": "116", "PHY102 Sec 2": "117", "CS271 Sec 1": "118",
    "STA202 Sec 2": "118/1", "CS232 Sec 1": "121", "CS101 Sec 1": "122"
}

EVENTS = {
    "Science Faculty Townhall": "135/1", "Science Project Pitching": "135/1",
    "Electronics Lab Safety Training": "141", "Sci-Tech Hackathon 2026": "141",
    "ลองชุดช็อปคณะวิทยาศาสตร์": "126", "ลงทะเบียนชมรมคณะวิดยา": "126"
}

MAP_DATA = {
  "building": "LC3",
  "nodes": [
    {"id": "LC3_hallway-1", "name": "hallway-1", "floor": 1, "x": 17.5, "y": 16.5, "type": "junction"},
    {"id": "LC3_hallway-2", "name": "hallway-2", "floor": 1, "x": 51.6, "y": 16.7, "type": "junction"},
    {"id": "LC3_hallway-3", "name": "hallway-3", "floor": 1, "x": 51.5, "y": 31.4, "type": "junction"},
    {"id": "LC3_hallway-4", "name": "hallway-4", "floor": 1, "x": 53.7, "y": 31.3, "type": "junction"},
    {"id": "LC3_hallway-5", "name": "hallway-5", "floor": 1, "x": 52.3, "y": 36.8, "type": "junction"},
    {"id": "LC3_hallway-6", "name": "hallway-6", "floor": 1, "x": 52.4, "y": 58.3, "type": "junction"},
    {"id": "LC3_hallway-7", "name": "hallway-7", "floor": 1, "x": 17.9, "y": 58.5, "type": "junction"},
    {"id": "LC3_hallway-8", "name": "hallway-8", "floor": 1, "x": 18, "y": 41.9, "type": "junction"},
    {"id": "LC3_hallway-9", "name": "hallway-9", "floor": 1, "x": 15.2, "y": 41.4, "type": "junction"},
    {"id": "LC3_109", "name": "109", "floor": 1, "x": 14.5, "y": 13.7, "type": "room"},
    {"id": "LC3_110", "name": "110", "floor": 1, "x": 13.9, "y": 17.1, "type": "room"},
    {"id": "LC3_111", "name": "111", "floor": 1, "x": 14, "y": 25.1, "type": "room"},
    {"id": "LC3_115", "name": "115", "floor": 1, "x": 13.6, "y": 48.5, "type": "room"},
    {"id": "LC3_116", "name": "116", "floor": 1, "x": 13.6, "y": 57.9, "type": "room"},
    {"id": "LC3_117", "name": "117", "floor": 1, "x": 14, "y": 61.5, "type": "room"},
    {"id": "LC3_118", "name": "118", "floor": 1, "x": 18, "y": 62.4, "type": "room"},
    {"id": "LC3_118/1", "name": "118/1", "floor": 1, "x": 26.1, "y": 62.6, "type": "room"},
    {"id": "LC3_120", "name": "120", "floor": 1, "x": 28.7, "y": 63, "type": "room"},
    {"id": "LC3_121", "name": "121", "floor": 1, "x": 31.7, "y": 62.6, "type": "room"},
    {"id": "LC3_121/1", "name": "121/1", "floor": 1, "x": 40.3, "y": 63.9, "type": "room"},
    {"id": "LC3_121/2", "name": "121/2", "floor": 1, "x": 42, "y": 60.4, "type": "room"},
    {"id": "LC3_121/3", "name": "121/3", "floor": 1, "x": 44.3, "y": 64.9, "type": "room"},
    {"id": "LC3_108/1", "name": "108/1", "floor": 1, "x": 16.7, "y": 11, "type": "room"},
    {"id": "LC3_108", "name": "108", "floor": 1, "x": 21.4, "y": 12.7, "type": "room"},
    {"id": "LC3_106", "name": "106", "floor": 1, "x": 24.2, "y": 12.7, "type": "room"},
    {"id": "LC3_104/1", "name": "104/1", "floor": 1, "x": 28.3, "y": 11.8, "type": "room"},
    {"id": "LC3_104", "name": "104", "floor": 1, "x": 32.4, "y": 11.6, "type": "room"},
    {"id": "LC3_103", "name": "103", "floor": 1, "x": 36.3, "y": 13.1, "type": "room"},
    {"id": "LC3_102/2", "name": "102/2", "floor": 1, "x": 40.9, "y": 13.5, "type": "room"},
    {"id": "LC3_102/1", "name": "102/1", "floor": 1, "x": 43.8, "y": 13.1, "type": "room"},
    {"id": "LC3_107", "name": "107", "floor": 1, "x": 24.2, "y": 19.9, "type": "room"},
    {"id": "LC3_105", "name": "105", "floor": 1, "x": 28, "y": 19.9, "type": "room"},
    {"id": "LC3_101/1", "name": "101/1", "floor": 1, "x": 31.6, "y": 19.9, "type": "room"},
    {"id": "LC3_101/2", "name": "101/2", "floor": 1, "x": 36.1, "y": 20.4, "type": "room"},
    {"id": "LC3_101", "name": "101", "floor": 1, "x": 46.8, "y": 24.2, "type": "room"},
    {"id": "LC3_119", "name": "119", "floor": 1, "x": 20.4, "y": 54.7, "type": "room"},
    {"id": "LC3_119/1", "name": "119/1", "floor": 1, "x": 22, "y": 54.7, "type": "room"},
    {"id": "LC3_119/2", "name": "119/2", "floor": 1, "x": 24, "y": 55, "type": "room"},
    {"id": "LC3_119/3", "name": "119/3", "floor": 1, "x": 25.5, "y": 54.8, "type": "room"},
    {"id": "LC3_119/4", "name": "119/4", "floor": 1, "x": 27.5, "y": 55.2, "type": "room"},
    {"id": "LC3_119/5", "name": "119/5", "floor": 1, "x": 29.2, "y": 55.2, "type": "room"},
    {"id": "LC3_122", "name": "122", "floor": 1, "x": 31.9, "y": 54.9, "type": "room"},
    {"id": "LC3_122/1", "name": "122/1", "floor": 1, "x": 41.1, "y": 53.7, "type": "room"},
    {"id": "LC3_122/2", "name": "122/2", "floor": 1, "x": 42, "y": 56.2, "type": "room"},
    {"id": "LC3_122/3", "name": "122/3", "floor": 1, "x": 43.4, "y": 53.9, "type": "room"},
    {"id": "LC3_122/4", "name": "122/4", "floor": 1, "x": 46, "y": 53.3, "type": "room"},
    {"id": "LC3_122/5", "name": "122/5", "floor": 1, "x": 47.4, "y": 56.6, "type": "room"},
    {"id": "LC3_122/6", "name": "122/6", "floor": 1, "x": 48.8, "y": 53.9, "type": "room"},
    {"id": "LC3_entry-1", "name": "entry-1", "floor": 1, "x": 21.1, "y": 16.7, "type": "entrance"},
    {"id": "LC3_entry-2", "name": "entry-2", "floor": 1, "x": 24.3, "y": 16.7, "type": "entrance"},
    {"id": "LC3_entry-3", "name": "entry-3", "floor": 1, "x": 28.3, "y": 16.7, "type": "entrance"},
    {"id": "LC3_entry-4", "name": "entry-4", "floor": 1, "x": 31.8, "y": 16.7, "type": "entrance"},
    {"id": "LC3_entry-5", "name": "entry-5", "floor": 1, "x": 36.1, "y": 16.7, "type": "entrance"},
    {"id": "LC3_entry-6", "name": "entry-6", "floor": 1, "x": 40.9, "y": 16.7, "type": "entrance"},
    {"id": "LC3_entry-7", "name": "entry-7", "floor": 1, "x": 44, "y": 16.7, "type": "entrance"},
    {"id": "LC3_entry-8", "name": "entry-8", "floor": 1, "x": 51.5, "y": 24.2, "type": "entrance"},
    {"id": "LC3_entry-9", "name": "entry-9", "floor": 1, "x": 52.4, "y": 53.9, "type": "entrance"},
    {"id": "LC3_entry-10", "name": "entry-10", "floor": 1, "x": 44.6, "y": 58.2, "type": "entrance"},
    {"id": "LC3_entry-11", "name": "entry-11", "floor": 1, "x": 40.4, "y": 58, "type": "entrance"},
    {"id": "LC3_entry-12", "name": "entry-12", "floor": 1, "x": 31.2, "y": 58.3, "type": "entrance"},
    {"id": "LC3_entry-13", "name": "entry-13", "floor": 1, "x": 29, "y": 58.3, "type": "entrance"},
    {"id": "LC3_entry-14", "name": "entry-14", "floor": 1, "x": 27.1, "y": 58.5, "type": "entrance"},
    {"id": "LC3_entry-15", "name": "entry-15", "floor": 1, "x": 25.3, "y": 58.5, "type": "entrance"},
    {"id": "LC3_entry-16", "name": "entry-16", "floor": 1, "x": 23.5, "y": 58.5, "type": "entrance"},
    {"id": "LC3_entry-17", "name": "entry-17", "floor": 1, "x": 21.8, "y": 58.4, "type": "entrance"},
    {"id": "LC3_entry-18", "name": "entry-18", "floor": 1, "x": 20.1, "y": 58.5, "type": "entrance"},
    {"id": "LC3_entry-19", "name": "entry-19", "floor": 1, "x": 18, "y": 48.6, "type": "entrance"},
    {"id": "LC3_entry-20", "name": "entry-20", "floor": 1, "x": 17.7, "y": 25.5, "type": "entrance"},
    {"id": "LC3_stair-1", "name": "stair-1", "floor": 1, "x": 17, "y": 40.1, "type": "stairs"},
    {"id": "LC3_stair-2", "name": "stair-2", "floor": 1, "x": 51.7, "y": 35, "type": "stairs"}
  ],
  "edges": [
    {"from": "LC3_hallway-1", "to": "LC3_entry-1", "type": "walk", "distance": 0},
    {"from": "LC3_entry-1", "to": "LC3_entry-2", "type": "walk", "distance": 0},
    {"from": "LC3_entry-2", "to": "LC3_entry-3", "type": "walk", "distance": 0},
    {"from": "LC3_entry-3", "to": "LC3_entry-4", "type": "walk", "distance": 0},
    {"from": "LC3_entry-4", "to": "LC3_entry-5", "type": "walk", "distance": 0},
    {"from": "LC3_entry-5", "to": "LC3_entry-6", "type": "walk", "distance": 0},
    {"from": "LC3_entry-6", "to": "LC3_entry-7", "type": "walk", "distance": 0},
    {"from": "LC3_entry-7", "to": "LC3_hallway-2", "type": "walk", "distance": 0},
    {"from": "LC3_hallway-2", "to": "LC3_entry-8", "type": "walk", "distance": 0},
    {"from": "LC3_entry-8", "to": "LC3_hallway-3", "type": "walk", "distance": 0},
    {"from": "LC3_hallway-3", "to": "LC3_hallway-4", "type": "walk", "distance": 0},
    {"from": "LC3_hallway-4", "to": "LC3_hallway-5", "type": "walk", "distance": 0},
    {"from": "LC3_hallway-5", "to": "LC3_entry-9", "type": "walk", "distance": 0},
    {"from": "LC3_entry-9", "to": "LC3_hallway-6", "type": "walk", "distance": 0},
    {"from": "LC3_hallway-6", "to": "LC3_entry-10", "type": "walk", "distance": 0},
    {"from": "LC3_entry-10", "to": "LC3_entry-11", "type": "walk", "distance": 0},
    {"from": "LC3_entry-11", "to": "LC3_entry-12", "type": "walk", "distance": 0},
    {"from": "LC3_entry-12", "to": "LC3_entry-13", "type": "walk", "distance": 0},
    {"from": "LC3_entry-13", "to": "LC3_entry-14", "type": "walk", "distance": 0},
    {"from": "LC3_entry-14", "to": "LC3_entry-15", "type": "walk", "distance": 0},
    {"from": "LC3_entry-15", "to": "LC3_entry-16", "type": "walk", "distance": 0},
    {"from": "LC3_entry-16", "to": "LC3_entry-17", "type": "walk", "distance": 0},
    {"from": "LC3_entry-17", "to": "LC3_entry-18", "type": "walk", "distance": 0},
    {"from": "LC3_entry-18", "to": "LC3_hallway-7", "type": "walk", "distance": 0},
    {"from": "LC3_hallway-7", "to": "LC3_entry-19", "type": "walk", "distance": 0},
    {"from": "LC3_hallway-8", "to": "LC3_entry-20", "type": "walk", "distance": 0},
    {"from": "LC3_entry-20", "to": "LC3_hallway-1", "type": "walk", "distance": 0},
    {"from": "LC3_entry-20", "to": "LC3_111", "type": "walk", "distance": 0},
    {"from": "LC3_hallway-1", "to": "LC3_110", "type": "walk", "distance": 0},
    {"from": "LC3_hallway-1", "to": "LC3_109", "type": "walk", "distance": 0},
    {"from": "LC3_hallway-1", "to": "LC3_108/1", "type": "walk", "distance": 0},
    {"from": "LC3_entry-1", "to": "LC3_108", "type": "walk", "distance": 0},
    {"from": "LC3_entry-2", "to": "LC3_106", "type": "walk", "distance": 0},
    {"from": "LC3_entry-2", "to": "LC3_107", "type": "walk", "distance": 0},
    {"from": "LC3_entry-3", "to": "LC3_104/1", "type": "walk", "distance": 0},
    {"from": "LC3_entry-3", "to": "LC3_105", "type": "walk", "distance": 0},
    {"from": "LC3_entry-4", "to": "LC3_104", "type": "walk", "distance": 0},
    {"from": "LC3_entry-4", "to": "LC3_101/1", "type": "walk", "distance": 0},
    {"from": "LC3_entry-5", "to": "LC3_103", "type": "walk", "distance": 0},
    {"from": "LC3_entry-5", "to": "LC3_101/2", "type": "walk", "distance": 0},
    {"from": "LC3_entry-6", "to": "LC3_102/2", "type": "walk", "distance": 0},
    {"from": "LC3_entry-7", "to": "LC3_102/1", "type": "walk", "distance": 0},
    {"from": "LC3_entry-8", "to": "LC3_101", "type": "walk", "distance": 0},
    {"from": "LC3_hallway-8", "to": "LC3_hallway-9", "type": "walk", "distance": 0},
    {"from": "LC3_hallway-9", "to": "LC3_stair-1", "type": "walk", "distance": 0},
    {"from": "LC3_hallway-5", "to": "LC3_stair-2", "type": "walk", "distance": 0},
    {"from": "LC3_entry-10", "to": "LC3_122/2", "type": "walk", "distance": 0},
    {"from": "LC3_entry-10", "to": "LC3_122/3", "type": "walk", "distance": 0},
    {"from": "LC3_entry-10", "to": "LC3_122/4", "type": "walk", "distance": 0},
    {"from": "LC3_entry-10", "to": "LC3_122/5", "type": "walk", "distance": 0},
    {"from": "LC3_entry-9", "to": "LC3_122/6", "type": "walk", "distance": 0},
    {"from": "LC3_entry-10", "to": "LC3_121/3", "type": "walk", "distance": 0},
    {"from": "LC3_entry-10", "to": "LC3_121/2", "type": "walk", "distance": 0},
    {"from": "LC3_entry-11", "to": "LC3_122/1", "type": "walk", "distance": 0},
    {"from": "LC3_122/2", "to": "LC3_122/1", "type": "walk", "distance": 0},
    {"from": "LC3_entry-11", "to": "LC3_121/1", "type": "walk", "distance": 0},
    {"from": "LC3_entry-12", "to": "LC3_122", "type": "walk", "distance": 0},
    {"from": "LC3_entry-12", "to": "LC3_121", "type": "walk", "distance": 0},
    {"from": "LC3_entry-13", "to": "LC3_120", "type": "walk", "distance": 0},
    {"from": "LC3_entry-13", "to": "LC3_119/5", "type": "walk", "distance": 0},
    {"from": "LC3_entry-14", "to": "LC3_118/1", "type": "walk", "distance": 0},
    {"from": "LC3_entry-14", "to": "LC3_119/4", "type": "walk", "distance": 0},
    {"from": "LC3_entry-15", "to": "LC3_119/3", "type": "walk", "distance": 0},
    {"from": "LC3_entry-16", "to": "LC3_119/2", "type": "walk", "distance": 0},
    {"from": "LC3_entry-17", "to": "LC3_hallway-7", "type": "walk", "distance": 0},
    {"from": "LC3_entry-18", "to": "LC3_119", "type": "walk", "distance": 0},
    {"from": "LC3_hallway-7", "to": "LC3_118", "type": "walk", "distance": 0},
    {"from": "LC3_hallway-7", "to": "LC3_117", "type": "walk", "distance": 0},
    {"from": "LC3_hallway-7", "to": "LC3_116", "type": "walk", "distance": 0},
    {"from": "LC3_entry-19", "to": "LC3_115", "type": "walk", "distance": 0},
    {"from": "LC3_entry-19", "to": "LC3_hallway-8", "type": "walk", "distance": 0},
    {"from": "LC3_entry-17", "to": "LC3_119/1", "type": "walk", "distance": 0}
  ]
}

node_id_lookup = { node["id"]: node for node in MAP_DATA["nodes"] }

room_entry_map = {}
for edge in MAP_DATA["edges"]:
    u, v = edge["from"], edge["to"]
    u_is_room = u in node_id_lookup and node_id_lookup[u]["type"] == "room"
    v_is_room = v in node_id_lookup and node_id_lookup[v]["type"] == "room"
    if u_is_room and not v_is_room:
        room_entry_map[u] = v
    elif v_is_room and not u_is_room:
        room_entry_map[v] = u

def get_location_details(room_num):
    node_id = f"LC3_{room_num}"
    if node_id in node_id_lookup and node_id_lookup[node_id]["type"] == "room":
        x = str(node_id_lookup[node_id]["x"])
        y = str(node_id_lookup[node_id]["y"])
        entry_node = room_entry_map.get(node_id, "Pending")
        return x, y, node_id, entry_node
    return "0.0", "0.0", node_id, "Pending"

with table.batch_writer() as batch:
    for room_num, room_name in ROOM_NAMES.items():
        x_val, y_val, node_id, entry_node = get_location_details(room_num)
        batch.put_item(Item={
            'SearchTerm': f"LC3-{room_num}", 'Detail': 'ROOM', 'NodeID': node_id,
            'NodeEntry': entry_node, 'RoomNumber': f"LC3-{room_num}", 'RoomName': room_name,
            'Floor': '1', 'X': x_val, 'Y': y_val, 'NodeType': 'room'
        })
    for node in MAP_DATA["nodes"]:
        if node["type"] != "room":
            batch.put_item(Item={
                'SearchTerm': node["id"], 'Detail': 'NODE', 'NodeID': node['id'],
                'NodeEntry': node['id'], 'RoomNumber': node["name"], 'RoomName': node["type"].capitalize(),
                'Floor': str(node['floor']), 'X': str(node['x']), 'Y': str(node['y']), 'NodeType': node['type']
            })
    for course, r_num in COURSES.items():
        x, y, nid, entry = get_location_details(r_num)
        batch.put_item(Item={
            'SearchTerm': course, 'Detail': 'COURSE', 'NodeID': nid, 'NodeEntry': entry,
            'RoomNumber': f"LC3-{r_num}", 'RoomName': ROOM_NAMES.get(r_num, "Lecture Room"),
            'Floor': '1', 'X': x, 'Y': y, 'NodeType': 'room'
        })
    for event, r_num in EVENTS.items():
        x, y, nid, entry = get_location_details(r_num)
        batch.put_item(Item={
            'SearchTerm': event, 'Detail': 'EVENT', 'NodeID': nid, 'NodeEntry': entry,
            'RoomNumber': f"LC3-{r_num}", 'RoomName': ROOM_NAMES.get(r_num, "Event Room"),
            'Floor': '1', 'X': x, 'Y': y, 'NodeType': 'room'
        })

print("Update seeding with updated coordinates and NodeEntry completed.")
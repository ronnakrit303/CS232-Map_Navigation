import json
import math
import os


DEFAULT_GRAPH_PATH = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "..", "Database", "graph.json")
)
GRAPH_PATH = os.environ.get("GRAPH_PATH", DEFAULT_GRAPH_PATH)
GRAPH_S3_BUCKET = os.environ.get("GRAPH_S3_BUCKET") or os.environ.get("S3_BUCKET")
GRAPH_S3_KEY = os.environ.get("GRAPH_S3_KEY") or os.environ.get("S3_KEY") or "graph.json"
TURN_THRESHOLD_DEGREES = 30

_GRAPH_CACHE = None


# สร้าง response มาตรฐานสำหรับส่งกลับผ่าน Lambda/API Gateway
def response(status_code, body):
    return {
        "statusCode": status_code,
        "headers": {
            "Access-Control-Allow-Origin": "*",
            "Content-Type": "application/json",
        },
        "body": json.dumps(body, ensure_ascii=False),
    }


def load_graph_from_s3(bucket, key):
    # ใช้ตอน deploy บน AWS Lambda โดยโหลด graph.json จาก S3
    import boto3

    s3 = boto3.client("s3")
    result = s3.get_object(Bucket=bucket, Key=key)
    return json.loads(result["Body"].read().decode("utf-8"))


def load_graph():
    # โหลด graph จาก S3 เมื่ออยู่บน AWS หรืออ่านไฟล์จริงเมื่อรัน local และ cache ไว้เพื่อลดการโหลดซ้ำ
    global _GRAPH_CACHE
    if _GRAPH_CACHE is None:
        if GRAPH_S3_BUCKET:
            _GRAPH_CACHE = load_graph_from_s3(GRAPH_S3_BUCKET, GRAPH_S3_KEY)
        else:
            with open(GRAPH_PATH, "r", encoding="utf-8") as graph_file:
                _GRAPH_CACHE = json.load(graph_file)
    return _GRAPH_CACHE


def parse_body(event):
    # แปลง body จาก API Gateway ให้เป็น dict เพื่อใช้งานต่อใน Lambda
    raw_body = event.get("body") if isinstance(event, dict) else None
    if raw_body is None:
        return {}
    if isinstance(raw_body, dict):
        return raw_body
    return json.loads(raw_body or "{}")


def normalize_path(path):
    # รองรับ path ที่ส่งมาเป็น list ของ node id หรือ list ของ object ที่มี id/node_id
    normalized = []
    for item in path:
        if isinstance(item, dict):
            node_id = item.get("id") or item.get("node_id")
        else:
            node_id = item
        if not node_id:
            raise ValueError("path contains an empty node id")
        normalized.append(str(node_id))
    return normalized


def build_lookups(graph):
    # สร้าง lookup ของ nodes และ edges เพื่อดึงข้อมูลแต่ละช่วงของ path ได้เร็ว
    nodes = {node["id"]: node for node in graph.get("nodes", [])}
    edges = {}
    for edge in graph.get("edges", []):
        from_node = edge.get("from")
        to_node = edge.get("to")
        if not from_node or not to_node:
            continue
        edges[(from_node, to_node)] = edge
        edges[(to_node, from_node)] = edge
    return nodes, edges


def segment_distance(start_node, end_node, edge):
    # ใช้ระยะจาก edge ก่อน ถ้าไม่มีหรือเป็น 0 จะคำนวณจากพิกัดของ node
    raw_distance = edge.get("distance") if edge else None
    try:
        distance = float(raw_distance)
    except (TypeError, ValueError):
        distance = 0

    if distance > 0:
        return round(distance, 1)

    dx = float(end_node.get("x", 0)) - float(start_node.get("x", 0))
    dy = float(end_node.get("y", 0)) - float(start_node.get("y", 0))
    return round(math.hypot(dx, dy), 1)


def vector_between(start_node, end_node):
    # สร้าง vector ของการเดินจาก node หนึ่งไปอีก node หนึ่ง เพื่อใช้คำนวณทิศทาง
    return (
        float(end_node.get("x", 0)) - float(start_node.get("x", 0)),
        float(end_node.get("y", 0)) - float(start_node.get("y", 0)),
    )


def turn_direction(previous_vector, next_vector):
    # เปรียบเทียบ vector ก่อนหน้าและถัดไป เพื่อบอกว่าเดินตรง เลี้ยวซ้าย เลี้ยวขวา หรือกลับหลัง
    prev_length = math.hypot(*previous_vector)
    next_length = math.hypot(*next_vector)
    if prev_length == 0 or next_length == 0:
        return "straight", "เดินตรง"

    dot = previous_vector[0] * next_vector[0] + previous_vector[1] * next_vector[1]
    cross = previous_vector[0] * next_vector[1] - previous_vector[1] * next_vector[0]
    angle = math.degrees(math.atan2(cross, dot))
    abs_angle = abs(angle)

    if abs_angle < TURN_THRESHOLD_DEGREES:
        return "straight", "เดินตรง"
    if abs_angle > 150:
        return "u_turn", "กลับหลัง"
    if angle > 0:
        return "right", "เลี้ยวขวา"
    return "left", "เลี้ยวซ้าย"


def heading_from_vector(vector):
    # แปลง vector เป็นทิศหลัก เพื่อให้ frontend รู้แนวการเดินของแต่ละช่วง
    dx, dy = vector
    if abs(dx) >= abs(dy):
        return "east" if dx >= 0 else "west"
    return "south" if dy >= 0 else "north"


def format_distance(distance):
    # แสดงระยะทางแบบไม่มี .0 ถ้าเป็นจำนวนเต็ม
    if float(distance).is_integer():
        return str(int(distance))
    return str(distance)


def is_stair_segment(start_node, end_node, edge):
    # ตรวจว่าช่วงทางนี้เป็นบันไดหรือเป็นการเคลื่อนที่ข้ามชั้น
    edge_type = (edge or {}).get("type", "")
    return (
        edge_type in {"stairs", "up", "down"}
        or start_node.get("type") == "stairs"
        and end_node.get("type") == "stairs"
        and start_node.get("floor") != end_node.get("floor")
    )


def stair_action(start_node, end_node, edge):
    # แยกคำสั่งบันไดขึ้น ลง หรือใช้บันไดทั่วไปจาก type ของ edge และเลขชั้น
    edge_type = (edge or {}).get("type", "")
    start_floor = int(start_node.get("floor", 0) or 0)
    end_floor = int(end_node.get("floor", 0) or 0)

    if edge_type == "up" or end_floor > start_floor:
        return "stairs_up", "up", f"ขึ้นบันไดไปชั้น {end_floor}"
    if edge_type == "down" or end_floor < start_floor:
        return "stairs_down", "down", f"ลงบันไดไปชั้น {end_floor}"
    return "stairs", "stairs", "ใช้บันได"


def build_instruction(step, action, direction, instruction, start_id, end_id, distance, heading, floor):
    # รวมข้อมูลของหนึ่งช่วงทางให้อยู่ในรูปแบบ instruction เดียวกันทุก step
    return {
        "step": step,
        "action": action,
        "direction": direction,
        "heading": heading,
        "instruction": instruction,
        "from_node": start_id,
        "to_node": end_id,
        "distance": distance,
        "unit": "m",
        "floor": floor,
    }


def generate_instructions(path, graph):
    # แปลง ordered path จาก pathfinding ให้เป็นชุดคำสั่งเดินทีละช่วง
    path_ids = normalize_path(path)
    if len(path_ids) < 2:
        raise ValueError("path must contain at least 2 nodes")

    nodes, edges = build_lookups(graph)
    missing_nodes = [node_id for node_id in path_ids if node_id not in nodes]
    if missing_nodes:
        raise ValueError(f"node not found: {', '.join(missing_nodes)}")

    instructions = []
    total_distance = 0

    for index in range(len(path_ids) - 1):
        # ประมวลผลทีละคู่ node เช่น A -> B, B -> C เพื่อสร้าง instruction ราย step
        start_id = path_ids[index]
        end_id = path_ids[index + 1]
        start_node = nodes[start_id]
        end_node = nodes[end_id]
        edge = edges.get((start_id, end_id), {})
        distance = segment_distance(start_node, end_node, edge)
        total_distance += distance

        if is_stair_segment(start_node, end_node, edge):
            # ถ้าเป็นบันได ให้สร้างคำสั่งพิเศษและไม่ต้องคำนวณเลี้ยวซ้ายขวา
            action, direction, text = stair_action(start_node, end_node, edge)
            instructions.append(
                build_instruction(
                    len(instructions) + 1,
                    action,
                    direction,
                    text,
                    start_id,
                    end_id,
                    distance,
                    "vertical",
                    end_node.get("floor"),
                )
            )
            continue

        current_vector = vector_between(start_node, end_node)
        heading = heading_from_vector(current_vector)
        if index == 0:
            # ช่วงแรกยังไม่มี vector ก่อนหน้า จึงถือว่าเริ่มด้วยการเดินตรง
            direction = "straight"
            text = f"เดินตรง {format_distance(distance)} ม."
        else:
            previous_vector = vector_between(nodes[path_ids[index - 1]], start_node)
            direction, turn_text = turn_direction(previous_vector, current_vector)
            if direction == "straight":
                text = f"เดินตรง {format_distance(distance)} ม."
            else:
                text = f"{turn_text} แล้วเดินต่อ {format_distance(distance)} ม."

        action = "walk" if direction == "straight" else f"turn_{direction}"
        instructions.append(
            build_instruction(
                len(instructions) + 1,
                action,
                direction,
                text,
                start_id,
                end_id,
                distance,
                heading,
                start_node.get("floor"),
            )
        )

    return {
        "status": "success",
        "path": path_ids,
        "total_distance": round(total_distance, 1),
        "unit": "m",
        "instructions": instructions,
    }


def lambda_handler(event, context):
    # Lambda entry point รับ path แล้วส่ง instructions กลับไปให้ gateway หรือ frontend
    try:
        body = parse_body(event)
    except json.JSONDecodeError:
        return response(400, {"status": "fail", "error": "invalid JSON"})

    path = body.get("path")
    if not isinstance(path, list):
        return response(400, {"status": "fail", "error": "path must be an array"})

    try:
        graph = body.get("graph") or load_graph()
        return response(200, generate_instructions(path, graph))
    except ValueError as error:
        return response(400, {"status": "fail", "error": str(error)})
    except FileNotFoundError:
        return response(500, {"status": "fail", "error": f"graph file not found: {GRAPH_PATH}"})
    except Exception as error:
        return response(500, {"status": "fail", "error": "Internal Server Error", "details": str(error)})

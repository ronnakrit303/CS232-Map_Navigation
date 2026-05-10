import heapq
import json
import math
import os


DEFAULT_GRAPH_PATH = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "..", "Database", "graph.json")
)

GRAPH_PATH = os.environ.get("GRAPH_PATH", DEFAULT_GRAPH_PATH)
GRAPH_S3_BUCKET = os.environ.get("GRAPH_S3_BUCKET") or os.environ.get("S3_BUCKET")
GRAPH_S3_KEY = os.environ.get("GRAPH_S3_KEY") or os.environ.get("S3_KEY") or "graph/graph.json"

_GRAPH_CACHE = None


# สร้าง response ให้มีรูปแบบเดียวกับที่ API Gateway ต้องการ
def response(status_code, body):
    return {
        "statusCode": status_code,
        "headers": {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
            "Content-Type": "application/json",
        },
        "body": json.dumps(body, ensure_ascii=False),
    }


def parse_body(event):
    raw_body = event.get("body") if isinstance(event, dict) else None
    if raw_body is None:
        return {}
    if isinstance(raw_body, dict):
        return raw_body
    return json.loads(raw_body or "{}")


def get_request_params(event):
    # รองรับทั้ง query string และ JSON body เพื่อให้เรียกจาก frontend หรือ test ได้สะดวก
    query_params = event.get("queryStringParameters") or {}
    body = parse_body(event)
    return {
        "start": query_params.get("start") or body.get("start"),
        "end": query_params.get("end") or body.get("end"),
        "graph": body.get("graph"),
    }


def load_graph_from_s3(bucket, key):
    # ใช้ตอน deploy บน AWS Lambda โดยโหลด graph.json จาก S3
    # รองรับทั้ง graph/graph.json และ graph.json เพื่อกันตั้ง Environment Variable ผิดเล็กน้อย
    import boto3

    s3 = boto3.client("s3")
    candidate_keys = []
    for candidate in [key, "graph/graph.json", "graph.json"]:
        if candidate and candidate not in candidate_keys:
            candidate_keys.append(candidate)

    last_error = None
    for candidate in candidate_keys:
        try:
            result = s3.get_object(Bucket=bucket, Key=candidate)
            return json.loads(result["Body"].read().decode("utf-8"))
        except Exception as error:
            last_error = error

    raise last_error


def load_graph():
    # cache graph ไว้ใน memory เพื่อลดการอ่านไฟล์หรือเรียก S3 ซ้ำใน Lambda warm start
    global _GRAPH_CACHE
    if _GRAPH_CACHE is not None:
        return _GRAPH_CACHE

    if GRAPH_S3_BUCKET:
        _GRAPH_CACHE = load_graph_from_s3(GRAPH_S3_BUCKET, GRAPH_S3_KEY)
        return _GRAPH_CACHE

    with open(GRAPH_PATH, "r", encoding="utf-8") as graph_file:
        _GRAPH_CACHE = json.load(graph_file)
    return _GRAPH_CACHE


def coordinate_distance(node_a, node_b):
    dx = float(node_a.get("x", 0)) - float(node_b.get("x", 0))
    dy = float(node_a.get("y", 0)) - float(node_b.get("y", 0))
    return math.hypot(dx, dy)


def edge_distance(start_node, end_node, edge):
    # ถ้า edge มี distance ให้ใช้ค่านั้น ถ้าไม่มีหรือเป็น 0 ให้คำนวณจากพิกัดของ node
    try:
        distance = float(edge.get("distance", 0))
    except (TypeError, ValueError):
        distance = 0

    if distance > 0:
        return distance
    return coordinate_distance(start_node, end_node)


def heuristic(current_node, end_node):
    # heuristic ของ A* ใช้ระยะเส้นตรงบนชั้นเดียวกัน ส่วนข้ามชั้นให้เป็น 0 เพื่อไม่ประเมินเกินจริง
    if current_node.get("floor") != end_node.get("floor"):
        return 0
    return coordinate_distance(current_node, end_node)


def build_adjacency(graph):
    # แปลง graph.json เป็น adjacency list เพื่อให้ algorithm หาเพื่อนบ้านของแต่ละ node ได้เร็ว
    nodes = {node["id"]: node for node in graph.get("nodes", []) if node.get("id")}
    adjacency = {node_id: [] for node_id in nodes}

    for edge in graph.get("edges", []):
        from_node = edge.get("from")
        to_node = edge.get("to")
        if from_node not in nodes or to_node not in nodes:
            continue

        distance = edge_distance(nodes[from_node], nodes[to_node], edge)
        adjacency[from_node].append((to_node, distance))
        adjacency[to_node].append((from_node, distance))

    return nodes, adjacency




def resolve_node_id(nodes, value):
    # รับได้ทั้ง id เต็ม เช่น LC3_F2_204 และชื่อห้องสั้น ๆ เช่น 204 หรือ 101/1
    if value is None:
        return None
    raw = str(value).strip()
    query = raw.lower().replace("lc3_", "").replace("f2_", "")

    if raw in nodes:
        return raw

    for node_id, node in nodes.items():
        if str(node.get("id", "")).lower() == raw.lower():
            return node_id

    for node_id, node in nodes.items():
        if str(node.get("name", "")).strip().lower() == query:
            return node_id

    for node_id in nodes:
        normalized_id = str(node_id).lower().replace("lc3_", "").replace("f2_", "")
        if normalized_id == query or normalized_id.endswith("_" + query) or normalized_id.endswith(query):
            return node_id

    return raw

def reconstruct_path(previous, start_node, end_node):
    # ย้อนจากปลายทางกลับไปต้นทางด้วย previous map แล้วกลับลำดับให้เป็น path ที่เดินจริง
    path = []
    current = end_node

    while current is not None:
        path.append(current)
        current = previous.get(current)

    path.reverse()
    if not path or path[0] != start_node:
        return []
    return path


def find_shortest_path(graph, start_node, end_node):
    # A* algorithm: เลือก node ที่มีค่าเดินทางจริง + heuristic ต่ำที่สุดก่อน
    nodes, adjacency = build_adjacency(graph)

    start_node = resolve_node_id(nodes, start_node)
    end_node = resolve_node_id(nodes, end_node)

    if start_node not in nodes:
        raise ValueError(f"start node not found: {start_node}")
    if end_node not in nodes:
        raise ValueError(f"end node not found: {end_node}")

    distances = {node_id: float("inf") for node_id in nodes}
    previous = {node_id: None for node_id in nodes}
    distances[start_node] = 0

    open_set = [(heuristic(nodes[start_node], nodes[end_node]), 0, start_node)]
    while open_set:
        _, current_distance, current_node = heapq.heappop(open_set)
        # ข้ามรายการเก่าใน priority queue ที่ไม่ใช่ระยะทางล่าสุดแล้ว
        if current_distance > distances[current_node]:
            continue

        if current_node == end_node:
            path = reconstruct_path(previous, start_node, end_node)
            return {
                "path": path,
                "total_distance": round(distances[end_node], 1),
            }

        for neighbor, weight in adjacency[current_node]:
            tentative_distance = current_distance + weight
            if tentative_distance >= distances[neighbor]:
                continue

            distances[neighbor] = tentative_distance
            previous[neighbor] = current_node
            priority = tentative_distance + heuristic(nodes[neighbor], nodes[end_node])
            heapq.heappush(open_set, (priority, tentative_distance, neighbor))

    return {
        "path": [],
        "total_distance": None,
    }


def lambda_handler(event, context):
    # Lambda entry point รับ start/end แล้วส่ง ordered path กลับไปให้ API Gateway หรือ frontend
    try:
        params = get_request_params(event or {})
    except json.JSONDecodeError:
        return response(400, {"status": "fail", "error": "invalid JSON"})

    start_node = params.get("start")
    end_node = params.get("end")

    if not start_node or not end_node:
        return response(400, {"status": "fail", "error": "Missing start or end node"})

    try:
        graph = params.get("graph") or load_graph()
        result = find_shortest_path(graph, start_node, end_node)
    except ValueError as error:
        return response(404, {"status": "fail", "error": str(error)})
    except FileNotFoundError:
        return response(500, {"status": "fail", "error": f"graph file not found: {GRAPH_PATH}"})
    except Exception as error:
        return response(500, {"status": "fail", "error": "Internal Server Error", "details": str(error)})

    if not result["path"]:
        return response(404, {"status": "fail", "error": "Path not found"})

    return response(
        200,
        {
            "status": "success",
            "path": result["path"],
            "total_distance": result["total_distance"],
            "unit": "m",
        },
    )

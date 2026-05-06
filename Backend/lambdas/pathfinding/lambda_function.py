import json
import os
import heapq
import math

DEFAULT_GRAPH_PATH = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "..", "Database", "graph.json")
)
GRAPH_PATH = os.environ.get("GRAPH_PATH", DEFAULT_GRAPH_PATH)

def load_graph():
    with open(GRAPH_PATH, "r", encoding="utf-8") as f:
        return json.load(f)

def calculate_euclidean(node_a, node_b):
    dx = float(node_a.get("x", 0)) - float(node_b.get("x", 0))
    dy = float(node_a.get("y", 0)) - float(node_b.get("y", 0))
    return math.hypot(dx, dy)

def lambda_handler(event, context):
    try:
        params = event.get('queryStringParameters') or {}
        start_node = params.get('start')
        end_node = params.get('end')

        if not start_node or not end_node:
            return {'statusCode': 400, 'headers': {'Access-Control-Allow-Origin': '*'}, 'body': json.dumps({'error': 'Missing start or end node'})}

        graph = load_graph()
        nodes = {n['id']: n for n in graph.get('nodes', [])}
        
        if start_node not in nodes or end_node not in nodes:
            return {'statusCode': 404, 'headers': {'Access-Control-Allow-Origin': '*'}, 'body': json.dumps({'error': 'Start or End node not found in graph'})}

        # สร้าง Adjacency List
        adj = {n: [] for n in nodes}
        for edge in graph.get('edges', []):
            u, v = edge.get('from'), edge.get('to')
            if not u or not v or u not in nodes or v not in nodes:
                continue
            
            dist = edge.get('distance')
            if not dist or float(dist) <= 0:
                dist = calculate_euclidean(nodes[u], nodes[v])
                
            adj[u].append((float(dist), v))
            adj[v].append((float(dist), u)) # กราฟเดินทางไป-กลับได้

        # Dijkstra Algorithm
        distances = {n: float('inf') for n in nodes}
        distances[start_node] = 0
        previous = {n: None for n in nodes}
        pq = [(0, start_node)]

        while pq:
            current_dist, current_node = heapq.heappop(pq)
            
            if current_dist > distances[current_node]:
                continue
                
            if current_node == end_node:
                break

            for weight, neighbor in adj[current_node]:
                distance = current_dist + weight
                if distance < distances[neighbor]:
                    distances[neighbor] = distance
                    previous[neighbor] = current_node
                    heapq.heappush(pq, (distance, neighbor))

        # ย้อนรอยหาเส้นทาง (Reconstruct Path)
        path = []
        curr = end_node
        while curr is not None:
            path.append(curr)
            curr = previous[curr]
        path.reverse()

        if not path or path[0] != start_node:
            return {'statusCode': 404, 'headers': {'Access-Control-Allow-Origin': '*'}, 'body': json.dumps({'error': 'Path not found'})}

        return {
            'statusCode': 200,
            'headers': {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'},
            'body': json.dumps({'status': 'success', 'path': path})
        }

    except Exception as e:
        return {'statusCode': 500, 'headers': {'Access-Control-Allow-Origin': '*'}, 'body': json.dumps({'error': str(e)})}
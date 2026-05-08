import json
import os
import sys


CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.dirname(CURRENT_DIR)
sys.path.append(BACKEND_DIR)

from lambdas.pathfinding import lambda_function as pathfinding_lambda
from lambdas.direction import lambda_function as direction_lambda


def json_response(status_code, body):
    return {
        "statusCode": status_code,
        "headers": {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type,Authorization",
            "Content-Type": "application/json",
        },
        "body": json.dumps(body, ensure_ascii=False),
    }


def invoke_search_service(query):
    # Import search เฉพาะตอนใช้งานจริง เพราะ search lambda ต้องใช้ boto3/DynamoDB
    from lambdas.search import lambda_function as search_lambda

    print(f"[Gateway] Searching for: {query}")
    mock_event = {"queryStringParameters": {"q": query}}
    response = search_lambda.lambda_handler(mock_event, None)

    if response.get("statusCode") == 200:
        body = json.loads(response["body"])
        if body.get("status") == "success":
            return {"target_node": body["target_node"], "room_name": body["room_name"]}
    return None


def invoke_pathfinding_lambda_event(event):
    return pathfinding_lambda.lambda_handler(event, None)


def invoke_pathfinding_service(start_node, end_node):
    print(f"[Gateway] Pathfinding: {start_node} -> {end_node}")
    mock_event = {"queryStringParameters": {"start": start_node, "end": end_node}}
    response = invoke_pathfinding_lambda_event(mock_event)

    if response.get("statusCode") == 200:
        body = json.loads(response["body"])
        if body.get("status") == "success":
            return body["path"]
    return []


def invoke_direction_lambda_event(event):
    return direction_lambda.lambda_handler(event, None)


def invoke_graph_service():
    graph = pathfinding_lambda.load_graph()
    return json_response(200, graph)


def invoke_direction_service(path_array):
    print(f"[Gateway] Generating directions for {len(path_array)} nodes")
    if not path_array or len(path_array) < 2:
        return []

    mock_event = {"body": json.dumps({"path": path_array})}
    response = invoke_direction_lambda_event(mock_event)

    if response.get("statusCode") == 200:
        body = json.loads(response["body"])
        if body.get("status") == "success":
            return body["instructions"]
    return []


def lambda_handler(event, context):
    try:
        query_params = event.get("queryStringParameters") or {}

        start_node = query_params.get("start", "LC3_entry_101")
        search_query = query_params.get("q", "")

        if not search_query:
            return json_response(400, {"error": 'Missing required parameter "q"'})

        search_result = invoke_search_service(search_query)
        if not search_result:
            return json_response(
                200,
                {"status": "fail", "message": f"ไม่พบข้อมูลสำหรับ '{search_query}'"},
            )

        target_node = search_result.get("target_node")
        path_array = invoke_pathfinding_service(start_node, target_node)
        if not path_array:
            return json_response(
                200,
                {"status": "fail", "message": f"ไม่สามารถค้นหาเส้นทางไปยัง '{search_query}' ได้"},
            )

        instructions = invoke_direction_service(path_array)

        return json_response(
            200,
            {
                "status": "success",
                "search_result": {
                    "keyword": search_query,
                    "target": search_result.get("room_name"),
                },
                "route": path_array,
                "instructions": instructions,
            },
        )

    except Exception as error:
        print(f"[Gateway] Error: {error}")
        return json_response(500, {"error": "Internal Server Error", "details": str(error)})


if __name__ == "__main__":
    from http.server import BaseHTTPRequestHandler, HTTPServer
    from urllib.parse import parse_qs, urlparse

    class LocalGatewayHandler(BaseHTTPRequestHandler):
        def send_lambda_response(self, response):
            self.send_response(response.get("statusCode", 200))
            for key, value in response.get("headers", {}).items():
                self.send_header(key, value)
            self.end_headers()
            self.wfile.write(response.get("body", "").encode("utf-8"))

        def do_OPTIONS(self):
            """Handle CORS preflight requests"""
            self.send_response(200)
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
            self.send_header("Access-Control-Allow-Headers", "Content-Type,Authorization")
            self.send_header("Content-Type", "application/json")
            self.end_headers()

        def do_GET(self):
            parsed_path = urlparse(self.path)
            qs = {key: value[0] for key, value in parse_qs(parsed_path.query).items()}

            if parsed_path.path in ("/pathfinding", "/api/pathfinding"):
                response = invoke_pathfinding_lambda_event({"queryStringParameters": qs})
            elif parsed_path.path in ("/graph", "/api/graph"):
                response = invoke_graph_service()
            elif parsed_path.path in ("/direction", "/directions", "/api/direction", "/api/directions"):
                path = [node for node in qs.get("path", "").split(",") if node]
                response = invoke_direction_lambda_event({"body": json.dumps({"path": path})})
            elif parsed_path.path in ("/search", "/api/search"):
                response = json_response(400, {"error": "Use POST for search"})
            else:
                response = lambda_handler({"queryStringParameters": qs}, None)

            self.send_lambda_response(response)

        def do_POST(self):
            parsed_path = urlparse(self.path)
            content_length = int(self.headers.get("Content-Length", 0))
            raw_body = self.rfile.read(content_length).decode("utf-8") if content_length else "{}"

            if parsed_path.path in ("/pathfinding", "/api/pathfinding"):
                response = invoke_pathfinding_lambda_event({"body": raw_body})
            elif parsed_path.path in ("/direction", "/directions", "/api/direction", "/api/directions"):
                response = invoke_direction_lambda_event({"body": raw_body})
            elif parsed_path.path in ("/search", "/api/search"):
                try:
                    body = json.loads(raw_body)
                    query = body.get("q", "").strip()
                    if query_params := urlparse(self.path).query:
                        query = dict(parse_qs(query_params)).get("q", [query])[0]
                    response = lambda_handler({"queryStringParameters": {"q": query}}, None)
                except Exception as e:
                    response = json_response(400, {"error": str(e)})
            else:
                response = json_response(404, {"status": "fail", "error": "endpoint not found"})

            self.send_lambda_response(response)

    port = 8000
    print(f"Integration API Server running on http://localhost:{port}")
    HTTPServer(("", port), LocalGatewayHandler).serve_forever()

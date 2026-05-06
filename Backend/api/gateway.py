import json
import os
import sys


CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.dirname(CURRENT_DIR)
sys.path.append(BACKEND_DIR)

# Import Services จริงเข้ามาใช้งาน
from lambdas.search import lambda_function as search_lambda
from lambdas.pathfinding import lambda_function as pathfinding_lambda
from lambdas.direction import lambda_function as direction_lambda

def invoke_search_service(query):
    print(f"[Gateway] 🔍 Searching for: {query}")
    mock_event = {'queryStringParameters': {'q': query}}
    response = search_lambda.lambda_handler(mock_event, None)
    
    if response.get('statusCode') == 200:
        body = json.loads(response['body'])
        if body.get('status') == 'success':
            return {"target_node": body['target_node'], "room_name": body['room_name']}
    return None

def invoke_pathfinding_service(start_node, end_node):
    print(f"[Gateway] 🗺️ Pathfinding: {start_node} -> {end_node}")
    mock_event = {'queryStringParameters': {'start': start_node, 'end': end_node}}
    response = pathfinding_lambda.lambda_handler(mock_event, None)
    
    if response.get('statusCode') == 200:
        body = json.loads(response['body'])
        if body.get('status') == 'success':
            return body['path']
    return []

def invoke_direction_service(path_array):
    print(f"[Gateway] 🧭 Generating directions for {len(path_array)} nodes")
    if not path_array or len(path_array) < 2:
        return []
        
    mock_event = {'body': json.dumps({'path': path_array})}
    response = direction_lambda.lambda_handler(mock_event, None)
    
    if response.get('statusCode') == 200:
        body = json.loads(response['body'])
        if body.get('status') == 'success':
            return body['instructions']
    return []

def lambda_handler(event, context):
    try:
        query_params = event.get('queryStringParameters') or {}
     
        start_node = query_params.get('start', 'LC3_entry_101') 
        search_query = query_params.get('q', '')

        if not search_query:
            return {
                'statusCode': 400,
                'headers': {'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Missing required parameter "q"'})
            }

      
        search_result = invoke_search_service(search_query)
        if not search_result:
            return {
                'statusCode': 200,
                'headers': {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json; charset=utf-8'},
                'body': json.dumps({"status": "fail", "message": f"ไม่พบข้อมูลสำหรับ '{search_query}'"}, ensure_ascii=False)
            }

        target_node = search_result.get('target_node')

        # 2. Pathfinding Service
        path_array = invoke_pathfinding_service(start_node, target_node)
        if not path_array:
            return {
                'statusCode': 200,
                'headers': {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json; charset=utf-8'},
                'body': json.dumps({"status": "fail", "message": f"ไม่สามารถค้นหาเส้นทางไปยัง '{search_query}' ได้"}, ensure_ascii=False)
            }

        # 3. Direction Service
        instructions = invoke_direction_service(path_array)

        response_body = {
            "status": "success",
            "search_result": {
                "keyword": search_query,
                "target": search_result.get('room_name')
            },
            "route": path_array,
            "instructions": instructions
        }

        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json; charset=utf-8'
            },
            'body': json.dumps(response_body, ensure_ascii=False)
        }

    except Exception as e:
        print(f"[Gateway] ❌ Error: {e}")
        return {
            'statusCode': 500,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Internal Server Error', 'details': str(e)})
        }

if __name__ == '__main__':
    from http.server import BaseHTTPRequestHandler, HTTPServer
    from urllib.parse import urlparse, parse_qs

    class LocalGatewayHandler(BaseHTTPRequestHandler):
        def do_OPTIONS(self):
            self.send_response(200, "ok")
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
            self.send_header('Access-Control-Allow-Headers', 'Content-Type')
            self.end_headers()

        def do_GET(self):
            parsed_path = urlparse(self.path)
            qs = {k: v[0] for k, v in parse_qs(parsed_path.query).items()}
            
            mock_event = {'queryStringParameters': qs}
            response = lambda_handler(mock_event, None)
            
            self.send_response(response.get('statusCode', 200))
            for key, value in response.get('headers', {}).items():
                self.send_header(key, value)
            self.end_headers()
            self.wfile.write(response['body'].encode('utf-8'))

    port = 8000
    print(f"🚀 Integration API Server running on http://localhost:{port}")
    HTTPServer(('', port), LocalGatewayHandler).serve_forever()
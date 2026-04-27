import json
import os


def invoke_search_service(query):
    # จำลองการค้นหาจาก Database (เหมือนที่ Search Lambda จะทำในอนาคต)
    query = query.lower()
    
    # ถ้ามีคำว่า cs232 หรือ 121 ให้เจอห้อง
    if "cs232" in query or "121" in query:
        return {"target_node": "LC3_121", "room_name": "CS232 Sec 1 (ห้อง 121)"}
    # ถ้ามีคำว่า hackathon หรือ 141 ให้เจอห้อง
    elif "hackathon" in query or "141" in query:
        return {"target_node": "LC3_141", "room_name": "Sci-Tech Hackathon (ห้อง 141)"}
    # ถ้าพิมพ์เลขห้อง 108 ตรงๆ
    elif query == "108":
        return {"target_node": "LC3_108", "room_name": "ห้อง 108"}
        
    # ถ้าพิมพ์อย่างอื่น (เช่น "3") ให้คืนค่า None แปลว่าไม่เจอ
    return None

def invoke_pathfinding_service(start_node, end_node):
 
   
    return [start_node, "LC3_hallway-1", end_node]

def invoke_direction_service(path_array):


    return [
        {"step": 1, "instruction": "เริ่มต้นการเดินทาง", "action": "straight", "node_id": path_array[0]},
        {"step": 2, "instruction": "คุณมาถึงเป้าหมายแล้ว", "action": "arrive", "node_id": path_array[-1]}
    ]

def lambda_handler(event, context):
    try:
        query_params = event.get('queryStringParameters') or {}
        start_node = query_params.get('start', 'LC3_entry-1')
        search_query = query_params.get('q', '')

        if not search_query:
            return {
                'statusCode': 400,
                'headers': {'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Missing required parameter "q"'})
            }

        # 1. เรียกใช้ Search Service 
        search_result = invoke_search_service(search_query)
        
        # 🌟 เพิ่มเช็คตรงนี้: ถ้าค้นหาไม่เจอ ให้ตอบกลับไปว่า Error 🌟
        if not search_result:
            return {
                'statusCode': 200, # ส่ง 200 แต่บอก status ว่า fail เพื่อให้ Frontend จัดการง่าย
                'headers': {'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({"status": "fail", "message": f"ไม่พบข้อมูลสำหรับ '{search_query}'"}, ensure_ascii=False)
            }

        target_node = search_result.get('target_node')

        # 
        path_array = invoke_pathfinding_service(start_node, target_node)

         
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
                'Content-Type': 'application/json'
            },
            'body': json.dumps(response_body, ensure_ascii=False)
        }

    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Internal Server Error', 'details': str(e)})
        }


if __name__ == '__main__':
    from http.server import BaseHTTPRequestHandler, HTTPServer
    from urllib.parse import urlparse, parse_qs

    class LocalGatewayHandler(BaseHTTPRequestHandler):
        def do_GET(self):
            parsed_path = urlparse(self.path)
            qs = {k: v[0] for k, v in parse_qs(parsed_path.query).items()}
            
           
            mock_event = {'queryStringParameters': qs}
            
            response = lambda_handler(mock_event, None)
            
            self.send_response(response['statusCode'])
            for key, value in response['headers'].items():
                self.send_header(key, value)
            self.end_headers()
            self.wfile.write(response['body'].encode('utf-8'))

    port = 8000
    print(f"Integration API Server running on http://localhost:{port}")
    HTTPServer(('', port), LocalGatewayHandler).serve_forever()
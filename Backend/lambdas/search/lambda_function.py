import json
import os
import boto3
from boto3.dynamodb.conditions import Attr

# ใช้ Table Name ให้ตรงกับที่เรา Seed ข้อมูลไว้
TABLE_NAME = os.environ.get('DDB_TABLE', 'LocationData')
dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
table = dynamodb.Table(TABLE_NAME)

def lambda_handler(event, context):
    try:
        query_params = event.get('queryStringParameters') or {}
        query = query_params.get('q', '').strip()

        if not query:
            return {
                'statusCode': 400,
                'headers': {'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Missing required parameter "q"'})
            }

        # ค้นหาแบบ Contains จาก SearchTerm หรือ RoomName (รองรับการพิมพ์บางส่วน)
        response = table.scan(
            FilterExpression=Attr('SearchTerm').contains(query) | Attr('RoomName').contains(query)
        )

        items = response.get('Items', [])

        if not items:
            return {
                'statusCode': 200, 
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json; charset=utf-8'
                },
                'body': json.dumps({"status": "fail", "message": f"ไม่พบข้อมูลสำหรับ '{query}'"}, ensure_ascii=False)
            }

        # เลือกข้อมูลที่ตรงที่สุด (ดึงอันดับแรกมาใช้งาน)
        best_match = items[0]

        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json; charset=utf-8'
            },
            'body': json.dumps({
                "status": "success",
                "target_node": best_match.get('NodeEntry', best_match.get('NodeID')), # ใช้ NodeEntry ส่งต่อให้ Pathfinding
                "room_name": best_match.get('RoomName', best_match.get('SearchTerm'))
            }, ensure_ascii=False)
        }

    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Internal Server Error', 'details': str(e)})
        }
import json
import os
import boto3

TABLE_NAME = os.environ.get('DDB_TABLE', 'LC3_CourseMapping_staging')
dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
table = dynamodb.Table(TABLE_NAME)

def lambda_handler(event, context):
    query = (event.get('queryStringParameters') or {}).get('q', '')
    return {
        'statusCode': 200,
        'headers': {'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({'message': 'alive', 'query': query})
    }

import json
import os

GRAPH_BUCKET = os.environ.get('GRAPH_BUCKET', 'lc3-navigator-config-staging')
GRAPH_KEY = os.environ.get('GRAPH_KEY', 'graph/graph.json')

def lambda_handler(event, context):
    try:
        body = json.loads(event.get('body') or '{}')
    except:
        return {'statusCode': 400, 'body': json.dumps({'error': 'invalid JSON'})}
    return {
        'statusCode': 200,
        'headers': {'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({'message': 'alive', 'from': body.get('from'), 'to': body.get('to')})
    }

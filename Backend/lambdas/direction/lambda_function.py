import json

def lambda_handler(event, context):
    try:
        body = json.loads(event.get('body') or '{}')
    except:
        return {'statusCode': 400, 'body': json.dumps({'error': 'invalid JSON'})}
    return {
        'statusCode': 200,
        'headers': {'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({'message': 'alive', 'path_length': len(body.get('path', []))})
    }

import json
import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(__file__))

from lambda_function import generate_instructions, lambda_handler


TEST_GRAPH = {
    "building": "LC3",
    "nodes": [
        {"id": "A", "floor": 1, "x": 0, "y": 0, "type": "entrance"},
        {"id": "B", "floor": 1, "x": 10, "y": 0, "type": "junction"},
        {"id": "C", "floor": 1, "x": 10, "y": 10, "type": "junction"},
        {"id": "D", "floor": 2, "x": 10, "y": 10, "type": "stairs"},
    ],
    "edges": [
        {"from": "A", "to": "B", "type": "walk", "distance": 20},
        {"from": "B", "to": "C", "type": "walk", "distance": 15},
        {"from": "C", "to": "D", "type": "stairs", "distance": 0},
    ],
}


class DirectionLambdaTest(unittest.TestCase):
    def test_generate_walk_turn_and_stairs_instructions(self):
        result = generate_instructions(["A", "B", "C", "D"], TEST_GRAPH)

        self.assertEqual(result["status"], "success")
        self.assertEqual(result["total_distance"], 35)
        self.assertEqual(len(result["instructions"]), 3)

        first, second, third = result["instructions"]
        self.assertEqual(first["action"], "walk")
        self.assertEqual(first["direction"], "straight")
        self.assertEqual(first["distance"], 20)
        self.assertEqual(first["instruction"], "เดินตรง 20 ม.")

        self.assertEqual(second["action"], "turn_right")
        self.assertEqual(second["direction"], "right")
        self.assertEqual(second["distance"], 15)
        self.assertEqual(second["instruction"], "เลี้ยวขวา แล้วเดินต่อ 15 ม.")

        self.assertEqual(third["action"], "stairs_up")
        self.assertEqual(third["direction"], "up")
        self.assertEqual(third["floor"], 2)
        self.assertEqual(third["instruction"], "ขึ้นบันไดไปชั้น 2")

    def test_lambda_handler_accepts_body_graph(self):
        event = {
            "body": json.dumps(
                {
                    "path": ["A", "B"],
                    "graph": TEST_GRAPH,
                }
            )
        }

        response = lambda_handler(event, None)
        body = json.loads(response["body"])

        self.assertEqual(response["statusCode"], 200)
        self.assertEqual(body["instructions"][0]["instruction"], "เดินตรง 20 ม.")

    def test_lambda_handler_rejects_invalid_json(self):
        response = lambda_handler({"body": "{"}, None)
        body = json.loads(response["body"])

        self.assertEqual(response["statusCode"], 400)
        self.assertEqual(body["error"], "invalid JSON")

    def test_lambda_handler_rejects_missing_node(self):
        event = {"body": json.dumps({"path": ["A", "Z"], "graph": TEST_GRAPH})}

        response = lambda_handler(event, None)
        body = json.loads(response["body"])

        self.assertEqual(response["statusCode"], 400)
        self.assertIn("node not found", body["error"])


if __name__ == "__main__":
    unittest.main()

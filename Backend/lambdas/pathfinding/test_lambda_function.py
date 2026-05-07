import json
import os
import sys
import unittest


sys.path.insert(0, os.path.dirname(__file__))

from lambda_function import build_adjacency, find_shortest_path, lambda_handler


DATABASE_GRAPH_PATH = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "..", "Database", "graph.json")
)


class PathfindingLambdaTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        with open(DATABASE_GRAPH_PATH, "r", encoding="utf-8") as graph_file:
            cls.graph = json.load(graph_file)
        _, cls.adjacency = build_adjacency(cls.graph)

    def assert_valid_real_graph_path(self, path, start_node, end_node):
        self.assertGreaterEqual(len(path), 2)
        self.assertEqual(path[0], start_node)
        self.assertEqual(path[-1], end_node)

        for current_node, next_node in zip(path, path[1:]):
            neighbors = [neighbor for neighbor, _ in self.adjacency[current_node]]
            self.assertIn(next_node, neighbors)

    def test_find_shortest_path_between_real_first_floor_rooms(self):
        result = find_shortest_path(self.graph, "LC3_101", "LC3_121")

        self.assert_valid_real_graph_path(result["path"], "LC3_101", "LC3_121")
        self.assertEqual(
            result["path"],
            [
                "LC3_101",
                "LC3_entry_101",
                "LC3_Junction_NM2",
                "LC3_Junction_NM3",
                "LC3_Junction_NM4",
                "LC3_Junction_MidBridge",
                "LC3_Junction_SM",
                "LC3_Junction_SM3",
                "LC3_Junction_SM2",
                "LC3_Junction_SM1",
                "LC3_entry_121,122",
                "LC3_121",
            ],
        )
        self.assertEqual(result["total_distance"], 614.0)

    def test_find_shortest_path_between_nearby_real_rooms(self):
        result = find_shortest_path(self.graph, "LC3_111", "LC3_110")

        self.assert_valid_real_graph_path(result["path"], "LC3_111", "LC3_110")
        self.assertEqual(result["path"], ["LC3_111", "LC3_entry_111", "LC3_entry_110", "LC3_110"])
        self.assertEqual(result["total_distance"], 189.0)

    def test_find_shortest_path_between_real_floors(self):
        result = find_shortest_path(self.graph, "LC3_stair-1", "LC3_F2_stair-1")

        self.assert_valid_real_graph_path(result["path"], "LC3_stair-1", "LC3_F2_stair-1")
        self.assertEqual(result["path"], ["LC3_stair-1", "LC3_F2_stair-1"])
        self.assertEqual(result["total_distance"], 27.0)

    def test_lambda_handler_loads_database_graph_file(self):
        event = {"queryStringParameters": {"start": "LC3_101", "end": "LC3_121"}}

        response = lambda_handler(event, None)
        body = json.loads(response["body"])

        self.assertEqual(response["statusCode"], 200)
        self.assertEqual(body["status"], "success")
        self.assert_valid_real_graph_path(body["path"], "LC3_101", "LC3_121")
        self.assertEqual(body["total_distance"], 614.0)

    def test_lambda_handler_rejects_missing_real_node(self):
        event = {"queryStringParameters": {"start": "LC3_101", "end": "LC3_NOT_FOUND"}}

        response = lambda_handler(event, None)
        body = json.loads(response["body"])

        self.assertEqual(response["statusCode"], 404)
        self.assertIn("end node not found", body["error"])


if __name__ == "__main__":
    unittest.main()

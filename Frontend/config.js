const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
window.CS232_API_BASE = isLocal 
  ? "http://localhost:8000" 
  : "https://s5lchevir3.execute-api.us-east-1.amazonaws.com/staging";

window.CS232_ROUTE_ENDPOINT = isLocal ? "/pathfinding" : "/route";

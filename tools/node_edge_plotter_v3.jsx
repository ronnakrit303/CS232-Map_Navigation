import { useState, useRef, useCallback } from "react";

const NODE_TYPES = [
  { id: "room", label: "ห้อง", color: "#3B82F6", icon: "🏢" },
  { id: "junction", label: "จุดเลี้ยว/แยก", color: "#F59E0B", icon: "◦" },
  { id: "stairs", label: "บันได", color: "#EF4444", icon: "🪜" },
  { id: "elevator", label: "ลิฟต์", color: "#8B5CF6", icon: "🛗" },
  { id: "entrance", label: "ทางเข้า", color: "#10B981", icon: "🚪" },
  { id: "facility", label: "สิ่งอำนวยความสะดวก", color: "#EC4899", icon: "🚻" },
];

const PREFIX = "LC3";

export default function App() {
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [mode, setMode] = useState("node");
  const [nodeType, setNodeType] = useState("room");
  const [nodeId, setNodeId] = useState("");
  const [nodeName, setNodeName] = useState("");
  const [edgeStart, setEdgeStart] = useState(null);
  const [edgeType, setEdgeType] = useState("walk");
  const [image, setImage] = useState(null);
  const [floor, setFloor] = useState(1);
  const [dragging, setDragging] = useState(null);
  const [editingNode, setEditingNode] = useState(null);
  const [editX, setEditX] = useState("");
  const [editY, setEditY] = useState("");
  const [editName, setEditName] = useState("");
  const imgRef = useRef(null);

  const getPos = (e) => {
    const rect = imgRef.current.getBoundingClientRect();
    return {
      x: Math.round(((e.clientX - rect.left) / rect.width) * 1000) / 10,
      y: Math.round(((e.clientY - rect.top) / rect.height) * 1000) / 10,
    };
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) setImage(URL.createObjectURL(file));
  };

  const handleJsonImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        if (data.nodes) setNodes(data.nodes);
        if (data.edges) setEdges(data.edges);
        alert(`โหลดสำเร็จ: ${data.nodes?.length || 0} nodes, ${data.edges?.length || 0} edges`);
      } catch { alert("ไฟล์ JSON ไม่ถูกต้อง"); }
    };
    reader.readAsText(file);
  };

  const findNode = (pos) => nodes.find(n => n.floor === floor && Math.sqrt((n.x - pos.x) ** 2 + (n.y - pos.y) ** 2) < 2.5);

  const handleMouseDown = (e) => {
    if (!image) return;
    const pos = getPos(e);
    const hit = findNode(pos);

    if (mode === "node") {
      if (hit) {
        setDragging(hit.id);
      } else {
        if (!nodeId.trim()) { alert("ใส่ ID ก่อนครับ เช่น 111, J1, ST1"); return; }
        const fullId = `${PREFIX}_${nodeId.trim()}`;
        if (nodes.some(n => n.id === fullId)) { alert(`ID "${fullId}" ซ้ำ`); return; }
        setNodes([...nodes, {
          id: fullId, name: nodeName.trim() || nodeId.trim(),
          floor, x: pos.x, y: pos.y, type: nodeType,
        }]);
        setNodeId("");
        setNodeName("");
      }
    } else if (mode === "edge") {
      if (!hit) return;
      if (!edgeStart) {
        setEdgeStart(hit);
      } else {
        if (hit.id !== edgeStart.id) {
          const exists = edges.some(e =>
            (e.from === edgeStart.id && e.to === hit.id) ||
            (e.from === hit.id && e.to === edgeStart.id)
          );
          if (!exists) {
            setEdges([...edges, { from: edgeStart.id, to: hit.id, type: edgeType, distance: 0 }]);
          }
        }
        setEdgeStart(null);
      }
    }
  };

  const handleMouseMove = useCallback((e) => {
    if (!dragging || !imgRef.current) return;
    const pos = getPos(e);
    setNodes(prev => prev.map(n => n.id === dragging ? { ...n, x: pos.x, y: pos.y } : n));
  }, [dragging]);

  const handleMouseUp = () => setDragging(null);

  const startEdit = (n) => {
    setEditingNode(n.id);
    setEditX(String(n.x));
    setEditY(String(n.y));
    setEditName(n.name);
  };

  const saveEdit = () => {
    const x = parseFloat(editX);
    const y = parseFloat(editY);
    if (isNaN(x) || isNaN(y)) { alert("พิกัดไม่ถูกต้อง"); return; }
    setNodes(prev => prev.map(n => n.id === editingNode ? { ...n, x, y, name: editName } : n));
    setEditingNode(null);
  };

  const cancelEdit = () => setEditingNode(null);

  const removeNode = (id) => {
    setNodes(nodes.filter(n => n.id !== id));
    setEdges(edges.filter(e => e.from !== id && e.to !== id));
    if (editingNode === id) setEditingNode(null);
  };

  const removeEdge = (i) => setEdges(edges.filter((_, idx) => idx !== i));

  const floorNodes = nodes.filter(n => n.floor === floor);
  const floorEdges = edges.filter(e => {
    const fn = nodes.find(n => n.id === e.from);
    const tn = nodes.find(n => n.id === e.to);
    return fn && tn && fn.floor === floor && tn.floor === floor;
  });

  const exportJSON = () => {
    const data = JSON.stringify({ building: PREFIX, nodes, edges }, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "graph_config.json"; a.click();
  };

  const getNodeColor = (type) => NODE_TYPES.find(t => t.id === type)?.color || "#999";

  return (
    <div style={{ minHeight: "100vh", background: "#0d1117", color: "#e6edf3", fontFamily: "sans-serif" }}
      onMouseMove={handleMouseMove} onMouseUp={handleMouseUp}>

      {/* Header */}
      <div style={{ background: "#161b22", padding: "8px 16px", borderBottom: "1px solid #21262d", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 16 }}>📍 Node & Edge Plotter v3</h1>
          <p style={{ margin: 0, fontSize: 11, color: "#8b949e" }}>
            {mode === "node" ? (dragging ? "🔄 กำลังลาก..." : "กดที่ว่าง = วาง node | กดค้างที่ node = ลาก") : (edgeStart ? `เลือกปลายทาง (จาก ${edgeStart.name})` : "กดที่ node เริ่มต้น")}
          </p>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={exportJSON} style={{ padding: "6px 14px", fontSize: 12, fontWeight: 700, borderRadius: 6, border: "none", cursor: "pointer", background: "#10B981", color: "#fff" }}>
            📥 Export
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div style={{ background: "#161b22", padding: "6px 16px", borderBottom: "1px solid #21262d", display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        {/* Floor */}
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{ fontSize: 11, color: "#8b949e" }}>ชั้น:</span>
          {[1, 2, 3, 4, 5].map(f => (
            <button key={f} onClick={() => setFloor(f)} style={{
              width: 26, height: 26, fontSize: 11, fontWeight: 600, borderRadius: 5, border: "none", cursor: "pointer",
              background: floor === f ? "#58a6ff" : "#21262d", color: floor === f ? "#fff" : "#8b949e",
            }}>{f}</button>
          ))}
        </div>

        <div style={{ width: 1, height: 22, background: "#30363d" }} />

        {/* Mode */}
        <div style={{ display: "flex", gap: 4 }}>
          <button onClick={() => { setMode("node"); setEdgeStart(null); }} style={{
            padding: "5px 10px", fontSize: 11, fontWeight: 600, borderRadius: 5, border: "none", cursor: "pointer",
            background: mode === "node" ? "#3B82F6" : "#21262d", color: mode === "node" ? "#fff" : "#8b949e",
          }}>📍 Node</button>
          <button onClick={() => setMode("edge")} style={{
            padding: "5px 10px", fontSize: 11, fontWeight: 600, borderRadius: 5, border: "none", cursor: "pointer",
            background: mode === "edge" ? "#F59E0B" : "#21262d", color: mode === "edge" ? "#fff" : "#8b949e",
          }}>🔗 Edge</button>
        </div>

        <div style={{ width: 1, height: 22, background: "#30363d" }} />

        {/* Node config */}
        {mode === "node" && (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ fontSize: 11, color: "#8b949e" }}>ID:</span>
              <span style={{ fontSize: 11, color: "#58a6ff" }}>{PREFIX}_</span>
              <input type="text" placeholder="111, J1..." value={nodeId} onChange={(e) => setNodeId(e.target.value)}
                style={{ padding: "4px 8px", fontSize: 11, borderRadius: 5, border: "1px solid #30363d", background: "#0d1117", color: "#e6edf3", width: 70 }} />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ fontSize: 11, color: "#8b949e" }}>ชื่อ:</span>
              <input type="text" placeholder="ห้องปฏิบัติการ..." value={nodeName} onChange={(e) => setNodeName(e.target.value)}
                style={{ padding: "4px 8px", fontSize: 11, borderRadius: 5, border: "1px solid #30363d", background: "#0d1117", color: "#e6edf3", width: 130 }} />
            </div>
            <div style={{ display: "flex", gap: 3 }}>
              {NODE_TYPES.map(t => (
                <button key={t.id} onClick={() => setNodeType(t.id)} style={{
                  padding: "3px 6px", fontSize: 10, borderRadius: 4, cursor: "pointer",
                  background: nodeType === t.id ? t.color + "33" : "#21262d",
                  color: nodeType === t.id ? t.color : "#8b949e",
                  border: nodeType === t.id ? `1px solid ${t.color}` : "1px solid transparent",
                }}>{t.icon} {t.label}</button>
              ))}
            </div>
          </>
        )}

        {/* Edge config */}
        {mode === "edge" && (
          <div style={{ display: "flex", gap: 4 }}>
            {["walk", "up", "down"].map(t => (
              <button key={t} onClick={() => setEdgeType(t)} style={{
                padding: "4px 10px", fontSize: 11, borderRadius: 4, border: "none", cursor: "pointer",
                background: edgeType === t ? "#F59E0B33" : "#21262d",
                color: edgeType === t ? "#F59E0B" : "#8b949e",
                border: edgeType === t ? "1px solid #F59E0B" : "1px solid transparent",
              }}>{t === "walk" ? "🚶 walk" : t === "up" ? "⬆️ up" : "⬇️ down"}</button>
            ))}
          </div>
        )}

        {/* File buttons */}
        <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
          <label style={{ padding: "5px 10px", fontSize: 11, borderRadius: 5, background: "#21262d", color: "#8b949e", cursor: "pointer" }}>
            🖼️ ภาพ
            <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: "none" }} />
          </label>
          <label style={{ padding: "5px 10px", fontSize: 11, borderRadius: 5, background: "#21262d", color: "#8b949e", cursor: "pointer" }}>
            📂 โหลด JSON
            <input type="file" accept=".json" onChange={handleJsonImport} style={{ display: "none" }} />
          </label>
        </div>
      </div>

      <div style={{ display: "flex", height: "calc(100vh - 90px)" }}>
        {/* Floor plan */}
        <div style={{ flex: 1, overflow: "auto", padding: 8 }}>
          {image ? (
            <div style={{ position: "relative", cursor: mode === "node" ? (dragging ? "grabbing" : "crosshair") : "pointer", userSelect: "none" }}
              onMouseDown={handleMouseDown}>
              <img ref={imgRef} src={image} alt="floor" style={{ width: "100%", display: "block", pointerEvents: "none" }} />
              <svg style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
                {/* Edges */}
                {floorEdges.map((e, i) => {
                  const fn = nodes.find(n => n.id === e.from);
                  const tn = nodes.find(n => n.id === e.to);
                  if (!fn || !tn) return null;
                  return <line key={i} x1={`${fn.x}%`} y1={`${fn.y}%`} x2={`${tn.x}%`} y2={`${tn.y}%`}
                    stroke="#F59E0B" strokeWidth="1" opacity="0.7" />;
                })}
                {/* Nodes */}
                {floorNodes.map(n => (
                  <g key={n.id}>
                    <circle cx={`${n.x}%`} cy={`${n.y}%`}
                      r={n.type === "junction" ? 2 : 3}
                      fill={getNodeColor(n.type)} opacity="0.9"
                      stroke={editingNode === n.id ? "#fff" : dragging === n.id ? "#fff" : "none"} strokeWidth="1" />
                    <text x={`${n.x}%`} y={`${n.y - 1.2}%`}
                      textAnchor="middle" fontSize="5" fill="#fff" fontWeight="600"
                      style={{ textShadow: "0 1px 2px rgba(0,0,0,0.9)" }}>
                      {n.name}
                    </text>
                    <text x={`${n.x}%`} y={`${n.y + 2.2}%`}
                      textAnchor="middle" fontSize="3.5" fill="#8b949e"
                      style={{ textShadow: "0 1px 2px rgba(0,0,0,0.9)" }}>
                      {n.id}
                    </text>
                  </g>
                ))}
                {/* Edge start */}
                {edgeStart && (
                  <circle cx={`${edgeStart.x}%`} cy={`${edgeStart.y}%`}
                    r="5" fill="none" stroke="#F59E0B" strokeWidth="1" strokeDasharray="3,2">
                    <animate attributeName="r" values="4;6;4" dur="1s" repeatCount="indefinite" />
                  </circle>
                )}
              </svg>
            </div>
          ) : (
            <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#8b949e" }}>
              <div style={{ textAlign: "center" }}>
                <span style={{ fontSize: 50, display: "block", marginBottom: 10 }}>🖼️</span>
                <span>กด "ภาพ" ที่แถบด้านบนเพื่ออัปโหลด floor plan</span>
              </div>
            </div>
          )}
        </div>

        {/* Side panel */}
        <div style={{ width: 280, background: "#161b22", borderLeft: "1px solid #21262d", padding: 10, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8 }}>

          {/* Edit panel */}
          {editingNode && (() => {
            const n = nodes.find(nd => nd.id === editingNode);
            if (!n) return null;
            return (
              <div style={{ background: "#1a2332", borderRadius: 8, padding: 12, border: "1px solid #58a6ff" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#58a6ff", marginBottom: 8 }}>✏️ แก้ไข {n.id}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <div>
                    <span style={{ fontSize: 10, color: "#8b949e" }}>ชื่อ:</span>
                    <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)}
                      style={{ width: "100%", padding: "4px 8px", fontSize: 12, borderRadius: 4, border: "1px solid #30363d", background: "#0d1117", color: "#e6edf3", boxSizing: "border-box", marginTop: 2 }} />
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontSize: 10, color: "#8b949e" }}>X:</span>
                      <input type="number" step="0.1" value={editX} onChange={(e) => setEditX(e.target.value)}
                        style={{ width: "100%", padding: "4px 8px", fontSize: 12, borderRadius: 4, border: "1px solid #30363d", background: "#0d1117", color: "#e6edf3", boxSizing: "border-box", marginTop: 2 }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontSize: 10, color: "#8b949e" }}>Y:</span>
                      <input type="number" step="0.1" value={editY} onChange={(e) => setEditY(e.target.value)}
                        style={{ width: "100%", padding: "4px 8px", fontSize: 12, borderRadius: 4, border: "1px solid #30363d", background: "#0d1117", color: "#e6edf3", boxSizing: "border-box", marginTop: 2 }} />
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={saveEdit} style={{ flex: 1, padding: "5px 0", fontSize: 11, fontWeight: 600, borderRadius: 5, border: "none", cursor: "pointer", background: "#10B981", color: "#fff" }}>✓ บันทึก</button>
                    <button onClick={cancelEdit} style={{ flex: 1, padding: "5px 0", fontSize: 11, fontWeight: 600, borderRadius: 5, border: "none", cursor: "pointer", background: "#21262d", color: "#8b949e" }}>✕ ยกเลิก</button>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Nodes list */}
          <div style={{ background: "#0d1117", borderRadius: 8, padding: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, color: "#58a6ff" }}>
              📋 Nodes ชั้น {floor} ({floorNodes.length})
            </div>
            {floorNodes.length === 0 && <div style={{ fontSize: 11, color: "#484f58" }}>ยังไม่มี node</div>}
            {floorNodes.map(n => (
              <div key={n.id} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "4px 0", fontSize: 11, borderBottom: "1px solid #161b22",
                background: editingNode === n.id ? "#1a233222" : "transparent",
              }}>
                <span onClick={() => startEdit(n)} style={{ cursor: "pointer", flex: 1 }}>
                  <span style={{ color: getNodeColor(n.type) }}>●</span> <span style={{ color: "#58a6ff" }}>{n.id}</span>
                  <span style={{ color: "#8b949e" }}> {n.name}</span>
                  <span style={{ color: "#484f58" }}> ({n.x}, {n.y})</span>
                </span>
                <button onClick={() => removeNode(n.id)}
                  style={{ background: "none", border: "none", color: "#EF4444", cursor: "pointer", fontSize: 11, flexShrink: 0 }}>✕</button>
              </div>
            ))}
          </div>

          {/* Edges list */}
          <div style={{ background: "#0d1117", borderRadius: 8, padding: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, color: "#F59E0B" }}>
              🔗 Edges ({floorEdges.length})
            </div>
            {floorEdges.length === 0 && <div style={{ fontSize: 11, color: "#484f58" }}>ยังไม่มี edge</div>}
            {floorEdges.map((e, i) => {
              const fn = nodes.find(n => n.id === e.from);
              const tn = nodes.find(n => n.id === e.to);
              return (
                <div key={i} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "4px 0", fontSize: 10, borderBottom: "1px solid #161b22",
                }}>
                  <span>{fn?.name} → {tn?.name} <span style={{ color: "#484f58" }}>({e.type})</span></span>
                  <button onClick={() => removeEdge(edges.indexOf(e))}
                    style={{ background: "none", border: "none", color: "#EF4444", cursor: "pointer", fontSize: 11 }}>✕</button>
                </div>
              );
            })}
          </div>

          {/* Stats */}
          <div style={{ background: "#0d1117", borderRadius: 8, padding: 10, fontSize: 11, color: "#8b949e" }}>
            <div>📊 ทั้งหมด: {nodes.length} nodes, {edges.length} edges</div>
            <div style={{ marginTop: 4 }}>
              {[1,2,3,4,5].map(f => {
                const c = nodes.filter(n => n.floor === f).length;
                return c > 0 ? <span key={f} style={{ marginRight: 8 }}>ชั้น{f}: {c}</span> : null;
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

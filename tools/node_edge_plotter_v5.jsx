import { useState, useRef, useCallback } from 'react';

const NODE_TYPES = [
  { id: 'room', label: 'ห้อง', color: '#3B82F6', icon: '🏢' },
  { id: 'junction', label: 'จุดเลี้ยว/แยก', color: '#F59E0B', icon: '◦' },
  { id: 'stairs', label: 'บันได', color: '#EF4444', icon: '🪜' },
  { id: 'elevator', label: 'ลิฟต์', color: '#8B5CF6', icon: '🛗' },
  { id: 'entrance', label: 'ทางเข้า', color: '#10B981', icon: '🚪' },
  { id: 'facility', label: 'สิ่งอำนวยความสะดวก', color: '#EC4899', icon: '🚻' },
];

const PREFIX = 'LC3';
const HIT_RADIUS = 10; // pixels

export default function App() {
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [mode, setMode] = useState('node');
  const [nodeType, setNodeType] = useState('room');
  const [nodeId, setNodeId] = useState('');
  const [nodeName, setNodeName] = useState('');
  const [edgeStart, setEdgeStart] = useState(null);
  const [edgeType, setEdgeType] = useState('walk');
  const [image, setImage] = useState(null);
  const [floor, setFloor] = useState(1);
  const [dragging, setDragging] = useState(null);
  const [dragOffset, setDragOffset] = useState({ dx: 0, dy: 0 });
  const [imgNaturalSize, setImgNaturalSize] = useState({ w: 1000, h: 800 });
  const [editingNode, setEditingNode] = useState(null);
  const [editX, setEditX] = useState('');
  const [editY, setEditY] = useState('');
  const [editName, setEditName] = useState('');
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ mx: 0, my: 0, px: 0, py: 0 });
  const [spaceHeld, setSpaceHeld] = useState(false);
  const svgRef = useRef(null);
  const viewportRef = useRef(null);

  // Convert screen coordinates → SVG coordinate space (handles zoom, scroll, transform)
  const getPos = (e) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const svgP = pt.matrixTransform(svg.getScreenCTM().inverse());
    return { x: Math.round(svgP.x), y: Math.round(svgP.y) };
  };

  // Zoom with Ctrl+Wheel on the viewport
  const handleWheel = (e) => {
    if (!e.ctrlKey) return;
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
    setZoom((z) => Math.min(10, Math.max(0.2, z * factor)));
  };

  // Keyboard: track Space for pan mode
  const handleKeyDown = (e) => {
    if (e.code === 'Space') { e.preventDefault(); setSpaceHeld(true); }
  };
  const handleKeyUp = (e) => {
    if (e.code === 'Space') setSpaceHeld(false);
  };

  // Zoom buttons
  const zoomIn = () => setZoom((z) => Math.min(10, z * 1.25));
  const zoomOut = () => setZoom((z) => Math.max(0.2, z / 1.25));
  const zoomReset = () => { setZoom(1); setPan({ x: 0, y: 0 }); };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      setImgNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });
      setImage(url);
    };
    img.src = url;
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
        alert(
          `โหลดสำเร็จ: ${data.nodes?.length || 0} nodes, ${
            data.edges?.length || 0
          } edges`
        );
      } catch {
        alert('ไฟล์ JSON ไม่ถูกต้อง');
      }
    };
    reader.readAsText(file);
  };

  // Hit detection — scale threshold by zoom so clicking stays easy at any zoom level
  const findNode = (pos) => {
    const threshold = HIT_RADIUS / zoom;
    return nodes.find(
      (n) =>
        n.floor === floor &&
        Math.sqrt((n.x - pos.x) ** 2 + (n.y - pos.y) ** 2) < threshold
    );
  };

  const handleMouseDown = (e) => {
    if (!image || !svgRef.current) return;

    // Pan mode: Space held or middle mouse button
    if (spaceHeld || e.button === 1) {
      e.preventDefault();
      setIsPanning(true);
      setPanStart({ mx: e.clientX, my: e.clientY, px: pan.x, py: pan.y });
      return;
    }

    const pos = getPos(e);
    const hit = findNode(pos);

    if (mode === 'node') {
      if (hit) {
        setDragging(hit.id);
        setDragOffset({ dx: pos.x - hit.x, dy: pos.y - hit.y });
      } else {
        if (!nodeId.trim()) {
          alert('ใส่ ID ก่อนครับ เช่น 111, J1, ST1');
          return;
        }
        const fullId = `${PREFIX}_${nodeId.trim()}`;
        if (nodes.some((n) => n.id === fullId)) {
          alert(`ID "${fullId}" ซ้ำ`);
          return;
        }
        setNodes([
          ...nodes,
          {
            id: fullId,
            name: nodeName.trim() || nodeId.trim(),
            floor,
            x: pos.x,
            y: pos.y,
            type: nodeType,
          },
        ]);
        setNodeId('');
        setNodeName('');
      }
    } else if (mode === 'edge') {
      if (!hit) return;
      if (!edgeStart) {
        setEdgeStart(hit);
      } else {
        if (hit.id !== edgeStart.id) {
          const exists = edges.some(
            (ed) =>
              (ed.from === edgeStart.id && ed.to === hit.id) ||
              (ed.from === hit.id && ed.to === edgeStart.id)
          );
          if (!exists) {
            setEdges([
              ...edges,
              { from: edgeStart.id, to: hit.id, type: edgeType, distance: 0 },
            ]);
          }
        }
        setEdgeStart(null);
      }
    }
  };

  const handleMouseMove = useCallback(
    (e) => {
      // Pan
      if (isPanning) {
        const dx = e.clientX - panStart.mx;
        const dy = e.clientY - panStart.my;
        setPan({ x: panStart.px + dx, y: panStart.py + dy });
        return;
      }
      // Drag node
      if (!dragging || !svgRef.current) return;
      const svg = svgRef.current;
      const pt = svg.createSVGPoint();
      pt.x = e.clientX;
      pt.y = e.clientY;
      const svgP = pt.matrixTransform(svg.getScreenCTM().inverse());
      const x = Math.round(svgP.x - dragOffset.dx);
      const y = Math.round(svgP.y - dragOffset.dy);
      setNodes((prev) =>
        prev.map((n) => (n.id === dragging ? { ...n, x, y } : n))
      );
    },
    [dragging, dragOffset, isPanning, panStart]
  );

  const handleMouseUp = () => { setDragging(null); setIsPanning(false); };

  const startEdit = (n) => {
    setEditingNode(n.id);
    setEditX(String(n.x));
    setEditY(String(n.y));
    setEditName(n.name);
  };

  const saveEdit = () => {
    const x = parseFloat(editX);
    const y = parseFloat(editY);
    if (isNaN(x) || isNaN(y)) {
      alert('พิกัดไม่ถูกต้อง');
      return;
    }
    setNodes((prev) =>
      prev.map((n) =>
        n.id === editingNode ? { ...n, x, y, name: editName } : n
      )
    );
    setEditingNode(null);
  };

  const cancelEdit = () => setEditingNode(null);

  const removeNode = (id) => {
    setNodes(nodes.filter((n) => n.id !== id));
    setEdges(edges.filter((e) => e.from !== id && e.to !== id));
    if (editingNode === id) setEditingNode(null);
  };

  const removeEdge = (i) => setEdges(edges.filter((_, idx) => idx !== i));

  const floorNodes = nodes.filter((n) => n.floor === floor);
  const floorEdges = edges.filter((e) => {
    const fn = nodes.find((n) => n.id === e.from);
    const tn = nodes.find((n) => n.id === e.to);
    return fn && tn && fn.floor === floor && tn.floor === floor;
  });

  const exportJSON = () => {
    const data = JSON.stringify({ building: PREFIX, nodes, edges }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'graph_config.json';
    a.click();
  };

  const getNodeColor = (type) =>
    NODE_TYPES.find((t) => t.id === type)?.color || '#999';

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0d1117',
        color: '#e6edf3',
        fontFamily: 'sans-serif',
        outline: 'none',
      }}
      tabIndex={-1}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onKeyDown={handleKeyDown}
      onKeyUp={handleKeyUp}
    >
      {/* Header */}
      <div
        style={{
          background: '#161b22',
          padding: '8px 16px',
          borderBottom: '1px solid #21262d',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: 16 }}>📍 Node & Edge Plotter v3</h1>
          <p style={{ margin: 0, fontSize: 11, color: '#8b949e' }}>
            {spaceHeld
              ? '✋ Pan mode — ลากเพื่อเลื่อน'
              : mode === 'node'
              ? dragging
                ? '🔄 กำลังลาก...'
                : 'คลิกว่าง = วาง | ลาก node = ย้าย | Space+ลาก = เลื่อน | Ctrl+Scroll = ซูม'
              : edgeStart
              ? `เลือกปลายทาง (จาก ${edgeStart.name})`
              : 'คลิก node เริ่มต้น | Space+ลาก = เลื่อน | Ctrl+Scroll = ซูม'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {/* Zoom controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 2, background: '#21262d', borderRadius: 6, padding: '2px 4px' }}>
            <button onClick={zoomOut} style={{ width: 24, height: 24, fontSize: 14, background: 'none', border: 'none', color: '#8b949e', cursor: 'pointer', borderRadius: 4 }}>−</button>
            <span
              onClick={zoomReset}
              style={{ fontSize: 11, color: '#58a6ff', minWidth: 40, textAlign: 'center', cursor: 'pointer', fontWeight: 700 }}
              title="คลิกเพื่อ reset"
            >
              {Math.round(zoom * 100)}%
            </span>
            <button onClick={zoomIn} style={{ width: 24, height: 24, fontSize: 14, background: 'none', border: 'none', color: '#8b949e', cursor: 'pointer', borderRadius: 4 }}>+</button>
          </div>
          <button
            onClick={exportJSON}
            style={{
              padding: '6px 14px',
              fontSize: 12,
              fontWeight: 700,
              borderRadius: 6,
              border: 'none',
              cursor: 'pointer',
              background: '#10B981',
              color: '#fff',
            }}
          >
            📥 Export
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div
        style={{
          background: '#161b22',
          padding: '6px 16px',
          borderBottom: '1px solid #21262d',
          display: 'flex',
          gap: 10,
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        {/* Floor */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: 11, color: '#8b949e' }}>ชั้น:</span>
          {[1, 2, 3, 4, 5].map((f) => (
            <button
              key={f}
              onClick={() => setFloor(f)}
              style={{
                width: 26,
                height: 26,
                fontSize: 11,
                fontWeight: 600,
                borderRadius: 5,
                border: 'none',
                cursor: 'pointer',
                background: floor === f ? '#58a6ff' : '#21262d',
                color: floor === f ? '#fff' : '#8b949e',
              }}
            >
              {f}
            </button>
          ))}
        </div>

        <div style={{ width: 1, height: 22, background: '#30363d' }} />

        {/* Mode */}
        <div style={{ display: 'flex', gap: 4 }}>
          <button
            onClick={() => {
              setMode('node');
              setEdgeStart(null);
            }}
            style={{
              padding: '5px 10px',
              fontSize: 11,
              fontWeight: 600,
              borderRadius: 5,
              border: 'none',
              cursor: 'pointer',
              background: mode === 'node' ? '#3B82F6' : '#21262d',
              color: mode === 'node' ? '#fff' : '#8b949e',
            }}
          >
            📍 Node
          </button>
          <button
            onClick={() => setMode('edge')}
            style={{
              padding: '5px 10px',
              fontSize: 11,
              fontWeight: 600,
              borderRadius: 5,
              border: 'none',
              cursor: 'pointer',
              background: mode === 'edge' ? '#F59E0B' : '#21262d',
              color: mode === 'edge' ? '#fff' : '#8b949e',
            }}
          >
            🔗 Edge
          </button>
        </div>

        <div style={{ width: 1, height: 22, background: '#30363d' }} />

        {/* Node config */}
        {mode === 'node' && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: 11, color: '#8b949e' }}>ID:</span>
              <span style={{ fontSize: 11, color: '#58a6ff' }}>{PREFIX}_</span>
              <input
                type="text"
                placeholder="111, J1..."
                value={nodeId}
                onChange={(e) => setNodeId(e.target.value)}
                style={{
                  padding: '4px 8px',
                  fontSize: 11,
                  borderRadius: 5,
                  border: '1px solid #30363d',
                  background: '#0d1117',
                  color: '#e6edf3',
                  width: 70,
                }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: 11, color: '#8b949e' }}>ชื่อ:</span>
              <input
                type="text"
                placeholder="ห้องปฏิบัติการ..."
                value={nodeName}
                onChange={(e) => setNodeName(e.target.value)}
                style={{
                  padding: '4px 8px',
                  fontSize: 11,
                  borderRadius: 5,
                  border: '1px solid #30363d',
                  background: '#0d1117',
                  color: '#e6edf3',
                  width: 130,
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: 3 }}>
              {NODE_TYPES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setNodeType(t.id)}
                  style={{
                    padding: '3px 6px',
                    fontSize: 10,
                    borderRadius: 4,
                    cursor: 'pointer',
                    background: nodeType === t.id ? t.color + '33' : '#21262d',
                    color: nodeType === t.id ? t.color : '#8b949e',
                    border:
                      nodeType === t.id
                        ? `1px solid ${t.color}`
                        : '1px solid transparent',
                  }}
                >
                  {t.icon} {t.label}
                </button>
              ))}
            </div>
          </>
        )}

        {/* Edge config */}
        {mode === 'edge' && (
          <div style={{ display: 'flex', gap: 4 }}>
            {['walk', 'up', 'down'].map((t) => (
              <button
                key={t}
                onClick={() => setEdgeType(t)}
                style={{
                  padding: '4px 10px',
                  fontSize: 11,
                  borderRadius: 4,
                  border: 'none',
                  cursor: 'pointer',
                  background: edgeType === t ? '#F59E0B33' : '#21262d',
                  color: edgeType === t ? '#F59E0B' : '#8b949e',
                  border:
                    edgeType === t
                      ? '1px solid #F59E0B'
                      : '1px solid transparent',
                }}
              >
                {t === 'walk' ? '🚶 walk' : t === 'up' ? '⬆️ up' : '⬇️ down'}
              </button>
            ))}
          </div>
        )}

        {/* File buttons */}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          <label
            style={{
              padding: '5px 10px',
              fontSize: 11,
              borderRadius: 5,
              background: '#21262d',
              color: '#8b949e',
              cursor: 'pointer',
            }}
          >
            🖼️ ภาพ
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              style={{ display: 'none' }}
            />
          </label>
          <label
            style={{
              padding: '5px 10px',
              fontSize: 11,
              borderRadius: 5,
              background: '#21262d',
              color: '#8b949e',
              cursor: 'pointer',
            }}
          >
            📂 โหลด JSON
            <input
              type="file"
              accept=".json"
              onChange={handleJsonImport}
              style={{ display: 'none' }}
            />
          </label>
        </div>
      </div>

      <div style={{ display: 'flex', height: 'calc(100vh - 90px)' }}>
        {/* Floor plan */}
        <div
          ref={viewportRef}
          style={{ flex: 1, overflow: 'hidden', padding: 8, position: 'relative' }}
          onWheel={handleWheel}
        >
          {image ? (
            <div
              style={{
                width: '100%',
                height: '100%',
                cursor: spaceHeld
                  ? isPanning ? 'grabbing' : 'grab'
                  : mode === 'node'
                  ? dragging ? 'grabbing' : 'crosshair'
                  : 'pointer',
                userSelect: 'none',
                overflow: 'hidden',
                position: 'relative',
              }}
              onMouseDown={handleMouseDown}
            >
              {/* Zoom & pan transform wrapper */}
              <div
                style={{
                  transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                  transformOrigin: '0 0',
                  display: 'inline-block',
                  width: '100%',
                }}
              >
                {/* Single SVG — getScreenCTM() correctly maps screen→SVG space */}
                <svg
                  id="map"
                  ref={svgRef}
                  style={{ width: '100%', display: 'block' }}
                  viewBox={`0 0 ${imgNaturalSize.w} ${imgNaturalSize.h}`}
                  preserveAspectRatio="xMidYMid meet"
                >
                  <image
                    href={image}
                    x="0"
                    y="0"
                    width={imgNaturalSize.w}
                    height={imgNaturalSize.h}
                    style={{ pointerEvents: 'none' }}
                  />

                  {/* Edges */}
                  {floorEdges.map((e, i) => {
                    const fn = nodes.find((n) => n.id === e.from);
                    const tn = nodes.find((n) => n.id === e.to);
                    if (!fn || !tn) return null;
                    return (
                      <line
                        key={i}
                        x1={fn.x}
                        y1={fn.y}
                        x2={tn.x}
                        y2={tn.y}
                        stroke="#F59E0B"
                        strokeWidth={1.5 / zoom}
                        opacity="0.85"
                      />
                    );
                  })}

                  {/* Nodes */}
                  {floorNodes.map((n) => {
                    const r = (n.type === 'junction' ? 3 : 5) / zoom;
                    const fontSize = 11 / zoom;
                    const fontSizeSmall = 9 / zoom;
                    return (
                      <g key={n.id}>
                        <circle
                          cx={n.x}
                          cy={n.y}
                          r={r}
                          fill={getNodeColor(n.type)}
                          opacity="0.95"
                          stroke={editingNode === n.id ? '#fff' : dragging === n.id ? '#fff' : 'none'}
                          strokeWidth={1.5 / zoom}
                        />
                        <text
                          x={n.x}
                          y={n.y - r - 3 / zoom}
                          textAnchor="middle"
                          fontSize={fontSize}
                          fill="#fff"
                          fontWeight="600"
                          style={{ filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.9))' }}
                        >
                          {n.name}
                        </text>
                        <text
                          x={n.x}
                          y={n.y + r + 10 / zoom}
                          textAnchor="middle"
                          fontSize={fontSizeSmall}
                          fill="#8b949e"
                          style={{ filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.9))' }}
                        >
                          {n.id}
                        </text>
                      </g>
                    );
                  })}

                  {/* Edge start indicator */}
                  {edgeStart && (
                    <circle
                      cx={edgeStart.x}
                      cy={edgeStart.y}
                      r={10 / zoom}
                      fill="none"
                      stroke="#F59E0B"
                      strokeWidth={1.5 / zoom}
                      strokeDasharray={`${5 / zoom},${3 / zoom}`}
                    >
                      <animate
                        attributeName="r"
                        values={`${8 / zoom};${14 / zoom};${8 / zoom}`}
                        dur="1s"
                        repeatCount="indefinite"
                      />
                    </circle>
                  )}
                </svg>
              </div>
            </div>
          ) : (
            <div
              style={{
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#8b949e',
              }}
            >
              <div style={{ textAlign: 'center' }}>
                <span style={{ fontSize: 50, display: 'block', marginBottom: 10 }}>
                  🖼️
                </span>
                <span>กด "ภาพ" ที่แถบด้านบนเพื่ออัปโหลด floor plan</span>
              </div>
            </div>
          )}
        </div>

        {/* Side panel */}
        <div
          style={{
            width: 280,
            background: '#161b22',
            borderLeft: '1px solid #21262d',
            padding: 10,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          {/* Edit panel */}
          {editingNode &&
            (() => {
              const n = nodes.find((nd) => nd.id === editingNode);
              if (!n) return null;
              return (
                <div
                  style={{
                    background: '#1a2332',
                    borderRadius: 8,
                    padding: 12,
                    border: '1px solid #58a6ff',
                  }}
                >
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: '#58a6ff',
                      marginBottom: 8,
                    }}
                  >
                    ✏️ แก้ไข {n.id}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div>
                      <span style={{ fontSize: 10, color: '#8b949e' }}>ชื่อ:</span>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '4px 8px',
                          fontSize: 12,
                          borderRadius: 4,
                          border: '1px solid #30363d',
                          background: '#0d1117',
                          color: '#e6edf3',
                          boxSizing: 'border-box',
                          marginTop: 2,
                        }}
                      />
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <div style={{ flex: 1 }}>
                        <span style={{ fontSize: 10, color: '#8b949e' }}>X (px):</span>
                        <input
                          type="number"
                          step="1"
                          value={editX}
                          onChange={(e) => setEditX(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '4px 8px',
                            fontSize: 12,
                            borderRadius: 4,
                            border: '1px solid #30363d',
                            background: '#0d1117',
                            color: '#e6edf3',
                            boxSizing: 'border-box',
                            marginTop: 2,
                          }}
                        />
                      </div>
                      <div style={{ flex: 1 }}>
                        <span style={{ fontSize: 10, color: '#8b949e' }}>Y (px):</span>
                        <input
                          type="number"
                          step="1"
                          value={editY}
                          onChange={(e) => setEditY(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '4px 8px',
                            fontSize: 12,
                            borderRadius: 4,
                            border: '1px solid #30363d',
                            background: '#0d1117',
                            color: '#e6edf3',
                            boxSizing: 'border-box',
                            marginTop: 2,
                          }}
                        />
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        onClick={saveEdit}
                        style={{
                          flex: 1,
                          padding: '5px 0',
                          fontSize: 11,
                          fontWeight: 600,
                          borderRadius: 5,
                          border: 'none',
                          cursor: 'pointer',
                          background: '#10B981',
                          color: '#fff',
                        }}
                      >
                        ✓ บันทึก
                      </button>
                      <button
                        onClick={cancelEdit}
                        style={{
                          flex: 1,
                          padding: '5px 0',
                          fontSize: 11,
                          fontWeight: 600,
                          borderRadius: 5,
                          border: 'none',
                          cursor: 'pointer',
                          background: '#21262d',
                          color: '#8b949e',
                        }}
                      >
                        ✕ ยกเลิก
                      </button>
                    </div>
                  </div>
                </div>
              );
            })()}

          {/* Nodes list */}
          <div style={{ background: '#0d1117', borderRadius: 8, padding: 10 }}>
            <div
              style={{
                fontSize: 12,
                fontWeight: 600,
                marginBottom: 8,
                color: '#58a6ff',
              }}
            >
              📋 Nodes ชั้น {floor} ({floorNodes.length})
            </div>
            {floorNodes.length === 0 && (
              <div style={{ fontSize: 11, color: '#484f58' }}>ยังไม่มี node</div>
            )}
            {floorNodes.map((n) => (
              <div
                key={n.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '4px 0',
                  fontSize: 11,
                  borderBottom: '1px solid #161b22',
                  background: editingNode === n.id ? '#1a233222' : 'transparent',
                }}
              >
                <span onClick={() => startEdit(n)} style={{ cursor: 'pointer', flex: 1 }}>
                  <span style={{ color: getNodeColor(n.type) }}>●</span>{' '}
                  <span style={{ color: '#58a6ff' }}>{n.id}</span>
                  <span style={{ color: '#8b949e' }}> {n.name}</span>
                  <span style={{ color: '#484f58' }}> ({n.x}px, {n.y}px)</span>
                </span>
                <button
                  onClick={() => removeNode(n.id)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#EF4444',
                    cursor: 'pointer',
                    fontSize: 11,
                    flexShrink: 0,
                  }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          {/* Edges list */}
          <div style={{ background: '#0d1117', borderRadius: 8, padding: 10 }}>
            <div
              style={{
                fontSize: 12,
                fontWeight: 600,
                marginBottom: 8,
                color: '#F59E0B',
              }}
            >
              🔗 Edges ({floorEdges.length})
            </div>
            {floorEdges.length === 0 && (
              <div style={{ fontSize: 11, color: '#484f58' }}>ยังไม่มี edge</div>
            )}
            {floorEdges.map((e, i) => {
              const fn = nodes.find((n) => n.id === e.from);
              const tn = nodes.find((n) => n.id === e.to);
              return (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '4px 0',
                    fontSize: 10,
                    borderBottom: '1px solid #161b22',
                  }}
                >
                  <span>
                    {fn?.name} → {tn?.name}{' '}
                    <span style={{ color: '#484f58' }}>({e.type})</span>
                  </span>
                  <button
                    onClick={() => removeEdge(edges.indexOf(e))}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#EF4444',
                      cursor: 'pointer',
                      fontSize: 11,
                    }}
                  >
                    ✕
                  </button>
                </div>
              );
            })}
          </div>

          {/* Stats */}
          <div
            style={{
              background: '#0d1117',
              borderRadius: 8,
              padding: 10,
              fontSize: 11,
              color: '#8b949e',
            }}
          >
            <div>📊 ทั้งหมด: {nodes.length} nodes, {edges.length} edges</div>
            <div style={{ marginTop: 4 }}>
              {[1, 2, 3, 4, 5].map((f) => {
                const c = nodes.filter((n) => n.floor === f).length;
                return c > 0 ? (
                  <span key={f} style={{ marginRight: 8 }}>
                    ชั้น{f}: {c}
                  </span>
                ) : null;
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

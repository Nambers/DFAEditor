import React, { useState, useRef, useCallback, useEffect, createContext } from 'react';
import { DataContext } from './DataProvider';
import type { Node, Edge } from './DataProvider';

const DFAEditor: React.FC = () => {
    const context = React.useContext(DataContext);
    if (!context) {
        throw new Error('DFAEditor must be used within a DataContext provider');
    }
    const { nodes, setNodes, edges, setEdges } = context;
    const [dragging, setDragging] = useState<string | null>(null);
    const [connecting, setConnecting] = useState<string | null>(null);
    const [connectingPreview, setConnectingPreview] = useState<{ x: number; y: number } | null>(null);
    const [selectedNode, setSelectedNode] = useState<string | null>(null);
    const [selectedEdge, setSelectedEdge] = useState<string | null>(null);
    const [editingNode, setEditingNode] = useState<string | null>(null);
    const [editingEdge, setEditingEdge] = useState<string | null>(null);
    const [tempLabel, setTempLabel] = useState('');

    const svgRef = useRef<SVGSVGElement>(null);
    const nextNodeId = useRef(0);
    const nextEdgeId = useRef(0);

    const getSVGPoint = useCallback((e: React.MouseEvent | MouseEvent): { x: number; y: number } => {
        if (!svgRef.current) return { x: 0, y: 0 };
        const rect = svgRef.current.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    }, []);

    // create node on double click
    const handleDoubleClick = useCallback((e: React.MouseEvent) => {
        const { x, y } = getSVGPoint(e);
        const newNode: Node = {
            id: `n_${nextNodeId.current++}`,
            x,
            y,
            label: "",
            accept: false
        };
        setNodes(prev => [...prev, newNode]);
        setEditingNode(newNode.id);
        setTempLabel(newNode.label);
    }, [nodes.length, getSVGPoint]);

    const handleNodeMouseDown = useCallback((nodeId: string, e: React.MouseEvent) => {
        e.stopPropagation();

        // select node
        setSelectedNode(nodeId);
        setSelectedEdge(null);

        if (e.shiftKey) {
            // start connecting
            setConnecting(nodeId);
            const { x, y } = getSVGPoint(e);
            setConnectingPreview({ x, y });
        } else {
            setDragging(nodeId);
        }
    }, [getSVGPoint]);

    // preview of dragging or connecting
    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        const { x, y } = getSVGPoint(e);

        if (dragging) {
            setNodes(prev => prev.map(node =>
                node.id === dragging ? { ...node, x, y } : node
            ));
        } else if (connecting && connectingPreview) {
            setConnectingPreview({ x, y });
        }
    }, [dragging, connecting, connectingPreview, getSVGPoint]);

    // end dragging or connecting
    const handleMouseUp = useCallback(() => {
        setDragging(null);
    }, []);

    // cancel connecting state when clicking on empty space
    const handleSVGClick = useCallback((e: React.MouseEvent) => {
        if (e.target === svgRef.current) {
            setSelectedNode(null);
            setSelectedEdge(null);
            if (connecting) {
                setConnecting(null);
                setConnectingPreview(null);
            }
        }
    }, [connecting]);

    const handleNodeClick = useCallback((nodeId: string, e: React.MouseEvent) => {
        e.stopPropagation();

        if (connecting && connecting !== nodeId) {
            // Finish connecting to another node
            const newEdge: Edge = {
                id: `e_${nextEdgeId.current++}`,
                from: connecting,
                to: nodeId,
                label: ''
            };
            setEdges(prev => [...prev, newEdge]);
            setConnecting(null);
            setConnectingPreview(null);
            setEditingEdge(newEdge.id);
            setTempLabel('');
        } else if (connecting && connecting === nodeId) {
            //  Self-loop
            const selfLoop: Edge = {
                id: `e_${nextEdgeId.current++}`,
                from: nodeId,
                to: nodeId,
                label: ''
            };
            setEdges(prev => [...prev, selfLoop]);
            setConnecting(null);
            setConnectingPreview(null);
            setEditingEdge(selfLoop.id);
            setTempLabel('');
        } else {
            handleMouseUp();
        }
    }, [connecting]);

    // Click edge to select
    const handleEdgeClick = useCallback((edgeId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setSelectedEdge(edgeId);
        setSelectedNode(null);
    }, []);
    // Double click node to edit label for node
    const handleNodeDoubleClick = useCallback((nodeId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const node = nodes.find(n => n.id === nodeId);
        if (node) {
            setEditingNode(nodeId);
            setTempLabel(node.label);
        }
    }, [nodes]);

    // Double click edge to edit label for edge
    const handleEdgeDoubleClick = useCallback((edgeId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const edge = edges.find(e => e.id === edgeId);
        if (edge) {
            setEditingEdge(edgeId);
            setTempLabel(edge.label);
        }
    }, [edges]);

    // Right click to toggle accept state
    const handleNodeRightClick = useCallback((nodeId: string, e: React.MouseEvent) => {
        e.preventDefault();
        setNodes(prev => prev.map(node =>
            node.id === nodeId ? { ...node, accept: !node.accept } : node
        ));
    }, []);

    // Save label edit text
    const saveLabelEdit = useCallback(() => {
        if (editingNode) {
            setNodes(prev => prev.map(node =>
                node.id === editingNode ? { ...node, label: tempLabel } : node
            ));
            setEditingNode(null);
        }
        if (editingEdge) {
            setEdges(prev => prev.map(edge =>
                edge.id === editingEdge ? { ...edge, label: tempLabel } : edge
            ));
            setEditingEdge(null);
        }
        setTempLabel('');
    }, [editingNode, editingEdge, tempLabel]);

    // Keyboard events
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Enter' && (editingNode || editingEdge)) {
                saveLabelEdit();
            }
            if (e.key === 'Escape') {
                setEditingNode(null);
                setEditingEdge(null);
                setConnecting(null);
                setConnectingPreview(null);
                setTempLabel('');
            }
            if (e.key === 'Delete') {
                if (selectedNode) {
                    setNodes(prev => prev.filter(n => n.id !== selectedNode));
                    setEdges(prev => prev.filter(e => e.from !== selectedNode && e.to !== selectedNode));
                    setSelectedNode(null);
                }
                if (selectedEdge) {
                    setEdges(prev => prev.filter(e => e.id !== selectedEdge));
                    setSelectedEdge(null);
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [editingNode, editingEdge, selectedNode, selectedEdge, saveLabelEdit]);

    // Calculate edge path and label position
    const getEdgePath = useCallback((edge: Edge) => {
        const fromNode = nodes.find(n => n.id === edge.from);
        const toNode = nodes.find(n => n.id === edge.to);

        if (!fromNode || !toNode) return { path: '', labelX: 0, labelY: 0 };

        if (edge.from === edge.to) {
            // Self-loop
            const cx = fromNode.x;
            const cy = fromNode.y - 50;
            const path = `M ${fromNode.x} ${fromNode.y - 30} 
                   C ${fromNode.x - 30} ${fromNode.y - 60}, 
                     ${fromNode.x + 30} ${fromNode.y - 60}, 
                     ${fromNode.x} ${fromNode.y - 30}`;
            return {
                path,
                labelX: cx,
                labelY: cy - 10, // label above the loop
                isLoop: true
            };
        } else {
            // Normal edge
            const dx = toNode.x - fromNode.x;
            const dy = toNode.y - fromNode.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            // calculate start and end points offset by node radius (30)
            const startX = fromNode.x + (dx / distance) * 30;
            const startY = fromNode.y + (dy / distance) * 30;
            const endX = toNode.x - (dx / distance) * 30;
            const endY = toNode.y - (dy / distance) * 30;

            // calculate mid point for label
            const midX = (startX + endX) / 2;
            const midY = (startY + endY) / 2;

            // offset label position perpendicular to the edge
            const perpX = -dy / distance * 15;
            const perpY = dx / distance * 15;

            return {
                path: `M ${startX} ${startY} L ${endX} ${endY}`,
                labelX: midX + perpX,
                labelY: midY + perpY,
                isLoop: false
            };
        }
    }, [nodes]);


    return (
        <div style={{ width: '100%', height: '100vh', background: '#f5f5f5' }}>
            <div style={{ height: "2rem", display: "flex", alignItems: "center", justifyContent: "center", padding: '10px', background: 'white', borderBottom: '1px solid #ddd' }}>
                <strong>DFA Editor</strong> &nbsp; | &nbsp;
                <span>
                    Double-click: create node | Drag: move | Shift+drag: create edge | Double-click: edit label | Right-click: toggle accept | Delete: remove
                </span>
            </div>

            <svg
                ref={svgRef}
                width="100%"
                height="calc(100vh - 60px)"
                onDoubleClick={handleDoubleClick}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onClick={handleSVGClick}
                style={{ cursor: connecting ? 'crosshair' : 'default' }}
            >
                {/* arr def in SVG */}
                <defs>
                    <marker id="arrowhead" markerWidth="10" markerHeight="7"
                        refX="9" refY="3.5" orient="auto">
                        <polygon points="0 0, 10 3.5, 0 7" fill="black" />
                    </marker>
                </defs>

                {/* preview */}
                {connecting && connectingPreview && (
                    (() => {
                        const fromNode = nodes.find(n => n.id === connecting);
                        if (!fromNode) return null;
                        return (
                            <line
                                x1={fromNode.x}
                                y1={fromNode.y}
                                x2={connectingPreview.x}
                                y2={connectingPreview.y}
                                stroke="red"
                                strokeWidth="2"
                                strokeDasharray="5,5"
                                opacity="0.7"
                            />
                        );
                    })()
                )}

                {/* rending each edge */}
                {edges.map(edge => {
                    const { path, labelX, labelY, isLoop } = getEdgePath(edge);
                    const isSelected = selectedEdge === edge.id;

                    return (
                        <g key={edge.id}>
                            <path
                                d={path}
                                stroke={isSelected ? "blue" : "black"}
                                strokeWidth={isSelected ? "3" : "2"}
                                fill="none"
                                markerEnd={isLoop ? undefined : "url(#arrowhead)"}
                                onDoubleClick={(e) => handleEdgeDoubleClick(edge.id, e)}
                                onClick={(e) => handleEdgeClick(edge.id, e)}
                                style={{ cursor: 'pointer' }}
                            />

                            {isLoop && (
                                <polygon
                                    points={`${labelX - 15},${labelY + 10} ${labelX + 15},${labelY + 25} ${labelX - 15},${labelY + 40}`}
                                    fill={isSelected ? "blue" : "black"}
                                />
                            )}

                            {/* rendering edge label */}
                            {editingEdge === edge.id ? (
                                <foreignObject x={labelX - 30} y={labelY - 10} width="60" height="20">
                                    <input
                                        type="text"
                                        value={tempLabel}
                                        onChange={(e) => setTempLabel(e.target.value)}
                                        onBlur={saveLabelEdit}
                                        style={{
                                            width: '100%',
                                            textAlign: 'center',
                                            border: '1px solid #ccc',
                                            fontSize: '12px',
                                            background: 'white'
                                        }}
                                        autoFocus
                                    />
                                </foreignObject>
                            ) : (
                                <text
                                    x={labelX}
                                    y={labelY + 4}
                                    textAnchor="middle"
                                    fontSize="12"
                                    fill={isSelected ? "blue" : "black"}
                                    style={{
                                        pointerEvents: 'none',
                                        background: 'white',
                                        padding: '2px'
                                    }}
                                >
                                    {edge.label}
                                </text>
                            )}
                        </g>
                    );
                })}

                {nodes.map(node => {
                    const isSelected = selectedNode === node.id;
                    const isConnectingFrom = connecting === node.id;

                    return (
                        <g key={node.id}>
                            {/* {isSelected && (
                                <circle
                                    cx={node.x}
                                    cy={node.y}
                                    r="35"
                                    fill="none"
                                    stroke="blue"
                                    strokeWidth="2"
                                    strokeDasharray="3,3"
                                />
                            )} */}

                            <circle
                                cx={node.x}
                                cy={node.y}
                                r="30"
                                fill="white"
                                stroke={isConnectingFrom ? "red" : (isSelected ? "blue" : "black")}
                                strokeWidth="2"
                                style={{ cursor: 'move' }}
                                onMouseDown={(e) => handleNodeMouseDown(node.id, e)}
                                onMouseUp={(e) => { handleNodeClick(node.id, e); }}
                                onDoubleClick={(e) => handleNodeDoubleClick(node.id, e)}
                                onContextMenu={(e) => handleNodeRightClick(node.id, e)}
                            />

                            {node.accept && (
                                <circle
                                    cx={node.x}
                                    cy={node.y}
                                    r="25"
                                    fill="none"
                                    stroke={isSelected ? "blue" : "black"}
                                    strokeWidth="2"
                                    style={{ pointerEvents: 'none' }}
                                />
                            )}

                            {editingNode === node.id ? (
                                <foreignObject x={node.x - 20} y={node.y - 8} width="40" height="16">
                                    <input
                                        type="text"
                                        value={tempLabel}
                                        onChange={(e) => setTempLabel(e.target.value)}
                                        onBlur={saveLabelEdit}
                                        style={{
                                            width: '100%',
                                            textAlign: 'center',
                                            border: '1px solid #ccc',
                                            fontSize: '12px'
                                        }}
                                        autoFocus
                                    />
                                </foreignObject>
                            ) : (
                                <text
                                    x={node.x}
                                    y={node.y + 4}
                                    textAnchor="middle"
                                    fontSize="14"
                                    fill={isSelected ? "blue" : "black"}
                                    style={{ pointerEvents: 'none', userSelect: 'none' }}
                                >
                                    {node.label}
                                </text>
                            )}
                        </g>
                    );
                })}

                {/* Hint */}
                {connecting && (
                    <text x="10" y="30" fontSize="14" fill="red">
                        Drag to target node to connect, or click same node for self-loop, ESC to cancel
                    </text>
                )}
            </svg>
        </div>
    );
};

export default DFAEditor;
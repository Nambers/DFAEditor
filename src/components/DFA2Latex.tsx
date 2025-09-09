import React, { useState, useRef, useCallback, useEffect } from 'react';
import { DataContext } from './DataProvider';
import type { Node, Edge } from './DataProvider';

interface LatexExportProps {
    isOpen: boolean;
    onClose: () => void;
}

const LatexExport: React.FC<LatexExportProps> = ({ isOpen, onClose }) => {
    const context = React.useContext(DataContext);
    if (!context) {
        throw new Error('DFA2Latex must be used within a DataContext provider');
    }
    const { nodes, edges } = context;
    const [generatedLatex, setGeneratedLatex] = useState('');

    // Parameter states
    const [toggleInitial, setToggleInitial] = useState(true);
    const [targetMaxWidth, setTargetMaxWidth] = useState(12);
    const [targetMaxHeight, setTargetMaxHeight] = useState(8);
    const [nodeDistance, setNodeDistance] = useState(2);
    const [shortenArrows, setShortenArrows] = useState(1);

    const generateLatex = useCallback(() => {
        if (nodes.length === 0) {
            setGeneratedLatex('% No nodes to export');
            return;
        }

        // Find bounds of all nodes
        const minX = Math.min(...nodes.map(n => n.x));
        const maxX = Math.max(...nodes.map(n => n.x));
        const minY = Math.min(...nodes.map(n => n.y));
        const maxY = Math.max(...nodes.map(n => n.y));

        // Calculate actual dimensions
        const actualWidth = maxX - minX;
        const actualHeight = maxY - minY;

        // Calculate scaling factor to fit within target dimensions
        const scaleX = actualWidth > 0 ? targetMaxWidth / actualWidth : 1;
        const scaleY = actualHeight > 0 ? targetMaxHeight / actualHeight : 1;
        const scale = Math.min(scaleX, scaleY); // Use smaller scale to maintain aspect ratio

        // Start the tikzpicture environment with configurable parameters
        let latex = `\\begin{tikzpicture}[shorten >=${shortenArrows}pt,node distance=${nodeDistance}cm,on grid,auto]\n`;

        // Generate nodes
        nodes.forEach((node, index) => {
            const nodeOptions = [];

            // Add state option
            nodeOptions.push('state');

            // Add initial option for first node
            if (index === 0 && toggleInitial) {
                nodeOptions.push('initial');
            }

            // Add accepting option if node is accepting
            if (node.accept) {
                nodeOptions.push('accepting');
            }

            const optionsStr = nodeOptions.join(',');

            // Calculate scaled position relative to top-left most node
            const relativeX = (node.x - minX) * scale;
            const relativeY = -(node.y - minY) * scale; // Negative for LaTeX coordinate system

            const positionStr = `at (${relativeX.toFixed(2)},${relativeY.toFixed(2)})`;
            const contentStr = node.label != "" ? `{$${node.label}$}` : '';
            latex += `   \\node[${optionsStr}] (${node.id}) ${positionStr} ${contentStr};\n`;
        });

        // Add paths section
        if (edges.length > 0) {
            latex += '   \\path[->]\n';

            // Group edges by source node
            const edgesBySource = edges.reduce((acc, edge) => {
                if (!acc[edge.from]) {
                    acc[edge.from] = [];
                }
                acc[edge.from].push(edge);
                return acc;
            }, {} as Record<string, Edge[]>);

            // Generate edge paths
            Object.entries(edgesBySource).forEach(([fromId, nodeEdges], sourceIndex) => {
                const fromNode = nodes.find(n => n.id === fromId);
                if (!fromNode) return;

                latex += `     (${fromNode.id})`;

                nodeEdges.forEach((edge, edgeIndex) => {
                    const toNode = nodes.find(n => n.id === edge.to);
                    if (!toNode) return;

                    if (edge.from === edge.to) {
                        // Self-loop
                        latex += ` edge [loop above] node {${edge.label}} ()`;
                    } else {
                        // Regular edge
                        const isSwap = shouldSwapLabel(fromNode, toNode, edge);
                        const swapStr = isSwap ? ' [swap]' : '';
                        latex += ` edge node${swapStr} {${edge.label}} (${toNode.id})`;
                    }

                    if (edgeIndex < nodeEdges.length - 1) {
                        latex += '\n          ';
                    }
                });

                if (sourceIndex < Object.keys(edgesBySource).length - 1) {
                    latex += '\n     ';
                } else {
                    latex += ';\n';
                }
            });
        }

        latex += '\\end{tikzpicture}';

        setGeneratedLatex(latex);
    }, [nodes, edges, targetMaxWidth, targetMaxHeight, nodeDistance, shortenArrows]);

    // Helper function to determine if label should be swapped
    const shouldSwapLabel = (fromNode: Node, toNode: Node, edge: Edge): boolean => {
        // Simple heuristic: swap if target is below source
        return toNode.y > fromNode.y;
    };

    const copyToClipboard = useCallback(async () => {
        try {
            await navigator.clipboard.writeText(generatedLatex);
            alert('LaTeX code copied to clipboard!');
        } catch (err) {
            console.error('Failed to copy: ', err);
        }
    }, [generatedLatex]);

    // Generate LaTeX when modal opens or data changes
    useEffect(() => {
        if (isOpen) {
            generateLatex();
        }
    }, [isOpen, generateLatex]);

    // Handle escape key to close modal
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            document.body.style.overflow = 'hidden'; // Prevent background scrolling
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000,
                padding: '20px'
            }}
            onClick={onClose}
        >
            <div
                style={{
                    backgroundColor: 'white',
                    borderRadius: '8px',
                    width: '90vw',
                    maxWidth: '1200px',
                    height: '80vh',
                    maxHeight: '800px',
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
                    overflow: 'hidden'
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Modal Header */}
                <div style={{
                    padding: '20px',
                    borderBottom: '1px solid #e0e0e0',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    backgroundColor: '#f8f9fa'
                }}>
                    <h2 style={{ margin: 0, color: '#333' }}>LaTeX Export</h2>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'none',
                            border: 'none',
                            fontSize: '24px',
                            cursor: 'pointer',
                            padding: '5px',
                            color: '#666',
                            borderRadius: '4px'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#e0e0e0'}
                        onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                        ×
                    </button>
                </div>

                {/* Modal Body */}
                <div style={{
                    padding: '20px',
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden'
                }}>
                    {/* Configuration Parameters */}
                    <div style={{
                        marginBottom: '20px',
                        padding: '15px',
                        backgroundColor: '#f8f9fa',
                        borderRadius: '6px',
                        border: '1px solid #e0e0e0'
                    }}>
                        <h3 style={{ margin: '0 0 15px 0', color: '#333', fontSize: '16px' }}>⚙️ Configuration Parameters</h3>
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                            gap: '15px'
                        }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: '500', color: '#555' }}>
                                    Toggle initial node
                                </label>
                                <input
                                    type="checkbox"
                                    checked={toggleInitial}
                                    onChange={() => { }}
                                    style={{ transform: 'scale(1.2)', cursor: 'not-allowed' }}
                                />
                                <div style={{ fontSize: '11px', color: '#999', marginTop: '3px' }}>
                                    (First node is always initial)
                                </div>
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: '500', color: '#555' }}>
                                    Max Width (cm)
                                </label>
                                <input
                                    type="number"
                                    value={targetMaxWidth}
                                    onChange={(e) => setTargetMaxWidth(parseFloat(e.target.value) || 12)}
                                    step="0.1"
                                    min="1"
                                    max="30"
                                    style={{
                                        width: '100%',
                                        padding: '8px',
                                        border: '1px solid #ddd',
                                        borderRadius: '4px',
                                        fontSize: '13px'
                                    }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: '500', color: '#555' }}>
                                    Max Height (cm)
                                </label>
                                <input
                                    type="number"
                                    value={targetMaxHeight}
                                    onChange={(e) => setTargetMaxHeight(parseFloat(e.target.value) || 8)}
                                    step="0.1"
                                    min="1"
                                    max="30"
                                    style={{
                                        width: '100%',
                                        padding: '8px',
                                        border: '1px solid #ddd',
                                        borderRadius: '4px',
                                        fontSize: '13px'
                                    }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: '500', color: '#555' }}>
                                    Node Distance (cm)
                                </label>
                                <input
                                    type="number"
                                    value={nodeDistance}
                                    onChange={(e) => setNodeDistance(parseFloat(e.target.value) || 2)}
                                    step="0.1"
                                    min="0.5"
                                    max="10"
                                    style={{
                                        width: '100%',
                                        padding: '8px',
                                        border: '1px solid #ddd',
                                        borderRadius: '4px',
                                        fontSize: '13px'
                                    }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: '500', color: '#555' }}>
                                    Arrow Shortening (pt)
                                </label>
                                <input
                                    type="number"
                                    value={shortenArrows}
                                    onChange={(e) => setShortenArrows(parseFloat(e.target.value) || 1)}
                                    step="0.1"
                                    min="0"
                                    max="5"
                                    style={{
                                        width: '100%',
                                        padding: '8px',
                                        border: '1px solid #ddd',
                                        borderRadius: '4px',
                                        fontSize: '13px'
                                    }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div style={{ marginBottom: '15px' }}>
                        <button
                            onClick={copyToClipboard}
                            style={{
                                padding: '10px 20px',
                                background: '#28a745',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '14px',
                                fontWeight: '500'
                            }}
                            disabled={!generatedLatex}
                        >
                            📋 Copy to Clipboard
                        </button>
                    </div>

                    {/* LaTeX Code Area */}
                    <textarea
                        value={generatedLatex}
                        readOnly
                        style={{
                            flex: 1,
                            fontFamily: '"Fira Code", "Consolas", "Monaco", monospace',
                            fontSize: '13px',
                            padding: '15px',
                            border: '1px solid #ddd',
                            borderRadius: '6px',
                            background: '#f8f9fa',
                            resize: 'none',
                            outline: 'none',
                            lineHeight: '1.5'
                        }}
                        placeholder="Generated LaTeX will appear here..."
                    />

                    {/* Usage Instructions */}
                    <div style={{
                        marginTop: '1rem',
                        padding: '1rem',
                        backgroundColor: '#e7f3ff',
                        borderRadius: '0.5rem',
                        fontSize: 'clamp(0.7rem, 2vw, 0.8rem)',
                        color: '#0066cc',
                        border: '1px solid #b3d9ff',
                        lineHeight: '1.6'
                    }}>
                        <strong>📝 Usage Instructions:</strong>
                        <br />
                        1. Copy the generated LaTeX code above
                        <br />
                        2. Add these packages to your LaTeX document preamble:
                        <br />
                        <code style={{
                            background: 'white',
                            borderRadius: '0.3rem',
                        }}>
                            \usepackage{'{tikz}'} <br />
                            \usetikzlibrary{'{automata,positioning}'}
                        </code>
                        <br />
                        3. Paste the generated code where you want the DFA to appear
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LatexExport;
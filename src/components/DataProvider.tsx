import { createContext, useState, type ReactNode } from 'react';
import Editor from './DFAEditor';
import LatexExport from './DFA2Latex';

export interface Node {
    id: string;
    x: number;
    y: number;
    label: string;
    accept: boolean;
}

export interface Edge {
    id: string;
    from: string;
    to: string;
    label: string;
    loopAngle?: number;
}

export interface DataContextType {
    nodes: Node[];
    setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
    edges: Edge[];
    setEdges: React.Dispatch<React.SetStateAction<Edge[]>>;
}

export const DataContext = createContext<DataContextType | undefined>(undefined);

export default function DataProvider() {
    const [nodes, setNodes] = useState<Node[]>([]);
    const [edges, setEdges] = useState<Edge[]>([]);
    const [isLatexModalOpen, setIsLatexModalOpen] = useState(false);

    return (
        <DataContext.Provider value={{ nodes, setNodes, edges, setEdges }}>
            <div style={{ display: 'flex', height: '100vh' }}>
                <div style={{ flex: 1 }}>
                    <Editor />
                    <button
                        onClick={() => setIsLatexModalOpen(true)}
                        style={{
                            position: 'absolute',
                            top: '0.25rem',
                            right: '1.25rem',
                            padding: '0.625rem 1.25rem',
                            background: '#007acc',
                            color: 'white',
                            border: 'none',
                            borderRadius: '0.375rem',
                            cursor: 'pointer',
                            fontSize: '0.875rem',
                            fontWeight: '500',
                            zIndex: 100
                        }}
                    >
                        📄 Export to LaTeX
                    </button>
                </div>
                <LatexExport
                    isOpen={isLatexModalOpen}
                    onClose={() => setIsLatexModalOpen(false)}
                />
            </div>
        </DataContext.Provider>
    );
}
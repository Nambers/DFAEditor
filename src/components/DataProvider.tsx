import { createContext, useState, useEffect } from 'react';
import Editor from './DFAEditor';
import LatexExport from './DFA2Latex';
import { Toaster, toast } from 'sonner'

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

    const saveToLocalStorage = () => {
        const data = { nodes, edges };
        localStorage.setItem('dfaData', JSON.stringify(data));
        toast.success('DFA saved to local storage!');
    }

    const loadFromLocalStorage = () => {
        const data = localStorage.getItem('dfaData');
        if (data) {
            const parsed = JSON.parse(data);
            setNodes(parsed.nodes || []);
            setEdges(parsed.edges || []);
            toast.success('DFA loaded from local storage!');
        } else {
            toast.error('No DFA data found in local storage.');
        }
    }

    useEffect(() => {
        loadFromLocalStorage();
    }, []);

    return (
        <>
            <Toaster />
            <DataContext.Provider value={{ nodes, setNodes, edges, setEdges }}>
                <div style={{ display: 'flex', height: '100vh' }}>
                    <div style={{ flex: 1 }}>
                        <Editor />
                        <button
                            onClick={saveToLocalStorage}
                            style={{
                                position: 'absolute',
                                top: '0.25rem',
                                left: '1.25rem',
                                padding: '0.625rem 1.25rem',
                                background: '#28a745',
                                color: 'white',
                                border: 'none',
                                borderRadius: '0.375rem',
                                cursor: 'pointer',
                                fontSize: '0.875rem',
                                fontWeight: '500',
                                zIndex: 100
                            }}
                        >
                            💾 Save DFA
                        </button>
                        <button
                            onClick={loadFromLocalStorage}
                            style={{
                                position: 'absolute',
                                top: '0.25rem',
                                left: '9.75rem',
                                padding: '0.625rem 1.25rem',
                                background: '#ffc107',
                                color: 'black',
                                border: 'none',
                                borderRadius: '0.375rem',
                                cursor: 'pointer',
                                fontSize: '0.875rem',
                                fontWeight: '500',
                                zIndex: 100
                            }}
                        >
                            📂 Load DFA
                        </button>
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
        </>
    );
}
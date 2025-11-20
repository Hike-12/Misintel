import { Download, ExternalLink } from "lucide-react";
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
} from "reactflow";
// @ts-ignore: Allow importing CSS side-effects without type declarations
import "reactflow/dist/style.css";
import { VerificationStep } from './types';

interface VerificationFlowDiagramProps {
  nodes: Node[];
  edges: Edge[];
  onNodesChange: any;
  onEdgesChange: any;
  verificationFlow: VerificationStep[];
  onDownload: () => void;
}

export function VerificationFlowDiagram({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  verificationFlow,
  onDownload,
}: VerificationFlowDiagramProps) {
  return (
    <div className="mt-6 bg-black/40 backdrop-blur-md border border-white/5 rounded-2xl p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-neutral-100">
          Verification Process
        </h3>
        <button
          onClick={onDownload}
          className="px-3 py-2 bg-neutral-700 hover:bg-neutral-600 text-neutral-200 rounded-lg transition-all duration-200 text-xs font-medium flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          Download Diagram
        </button>
      </div>

      <div
        id="verification-flow-diagram"
        className="w-full h-[600px] bg-black/60 rounded-lg"
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          fitView
          minZoom={0.5}
          maxZoom={1.5}
        >
          <Background color="#333" gap={16} />
          <Controls className="bg-neutral-800 border border-neutral-700" />
          <MiniMap
            className="bg-neutral-900 border border-neutral-700"
            nodeColor={(node) => {
              const status = verificationFlow?.find(
                (s) => s.id === node.id
              )?.status;
              return status === "success"
                ? "#22c55e"
                : status === "warning"
                ? "#eab308"
                : status === "error"
                ? "#ef4444"
                : "#3b82f6";
            }}
          />
        </ReactFlow>
      </div>
    </div>
  );
}

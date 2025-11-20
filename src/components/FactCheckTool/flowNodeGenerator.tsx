import React from "react";
import { Node, Edge, MarkerType } from "reactflow";
import { ExternalLink } from "lucide-react";
import { VerificationStep } from './types';

export function generateFlowNodes(
  steps: VerificationStep[],
  translatedFlow?: Array<{ label: string; details: string }>
): { nodes: Node[]; edges: Edge[] } {
  const nodeWidth = 280;
  const nodeHeight = 120;
  const horizontalSpacing = 350;
  const verticalSpacing = 200;

  const flowTranslations = translatedFlow || [];

  const nodes: Node[] = steps.map((step, index) => {
    const row = Math.floor(index / 3);
    const col = index % 3;

    const translatedStep = flowTranslations[index] || {
      label: step.label,
      details: step.details,
    };

    return {
      id: step.id,
      type: "default",
      position: {
        x: col * horizontalSpacing,
        y: row * verticalSpacing,
      },
      data: {
        label: (
          <div className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-sm">
                {translatedStep.label}
              </span>
              <span
                className={`text-xs px-2 py-1 rounded-full ${
                  step.status === "success"
                    ? "bg-green-500/20 text-green-400"
                    : step.status === "warning"
                    ? "bg-yellow-500/20 text-yellow-400"
                    : step.status === "error"
                    ? "bg-red-500/20 text-red-400"
                    : "bg-blue-500/20 text-blue-400"
                }`}
              >
                {step.status === "success"
                  ? "✓"
                  : step.status === "warning"
                  ? "⚠"
                  : step.status === "error"
                  ? "✕"
                  : "⋯"}
              </span>
            </div>
            <p className="text-xs text-neutral-400 mb-2">
              {translatedStep.details}
            </p>
            {step.sources && step.sources.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {step.sources.slice(0, 2).map((source, i) => (
                  <a
                    key={i}
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span className="truncate max-w-[100px]">
                      {source.title}
                    </span>
                  </a>
                ))}
              </div>
            )}
          </div>
        ),
      },
      style: {
        background: "rgba(0, 0, 0, 0.6)",
        border: `1px solid ${
          step.status === "success"
            ? "rgba(34, 197, 94, 0.3)"
            : step.status === "warning"
            ? "rgba(234, 179, 8, 0.3)"
            : step.status === "error"
            ? "rgba(239, 68, 68, 0.3)"
            : "rgba(59, 130, 246, 0.3)"
        }`,
        borderRadius: "12px",
        color: "#fff",
        width: nodeWidth,
        minHeight: nodeHeight,
      },
    };
  });

  const edges: Edge[] = steps.slice(0, -1).map((step, index) => ({
    id: `e${step.id}-${steps[index + 1].id}`,
    source: step.id,
    target: steps[index + 1].id,
    type: "smoothstep",
    animated: true,
    style: { stroke: "#666", strokeWidth: 2 },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color: "#666",
    },
  }));

  return { nodes, edges };
}

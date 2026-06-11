"use client";

import type { AnalysisResult } from "@/lib/types";

const MARKER_COLORS = ["#dc2626", "#0284c7", "#16a34a", "#ea580c", "#7c3aed"];

type ViewerDrawingProps = {
  result: AnalysisResult;
};

export function ViewerDrawing({ result }: ViewerDrawingProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-inner">
      <img
        src={result.previewDataUrl}
        alt="Analyzed drawing"
        className="block h-auto w-full"
      />
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full"
        viewBox={`0 0 ${result.pageWidth} ${result.pageHeight}`}
        preserveAspectRatio="none"
      >
        {result.bomTableRegion && (
          <rect
            x={result.bomTableRegion.x * result.pageWidth}
            y={result.bomTableRegion.y * result.pageHeight}
            width={result.bomTableRegion.width * result.pageWidth}
            height={result.bomTableRegion.height * result.pageHeight}
            fill="rgba(14, 165, 233, 0.08)"
            stroke="rgba(14, 165, 233, 0.8)"
            strokeWidth={2}
            strokeDasharray="8 6"
          />
        )}
        {result.placements.map((placement) => {
          const color = MARKER_COLORS[(placement.itemNo - 1) % MARKER_COLORS.length];
          const tipX = placement.tipPoint.x * result.pageWidth;
          const tipY = placement.tipPoint.y * result.pageHeight;
          const balloon = placement.balloonBbox;
          const balloonX = (balloon.x + balloon.width / 2) * result.pageWidth;
          const balloonY = (balloon.y + balloon.height / 2) * result.pageHeight;

          return (
            <g key={placement.itemNo}>
              <line
                x1={tipX}
                y1={tipY}
                x2={balloonX}
                y2={balloonY}
                stroke={color}
                strokeWidth={2}
                opacity={0.55}
              />
              <circle cx={tipX} cy={tipY} r={14} fill="white" stroke={color} strokeWidth={3} />
              <text
                x={tipX}
                y={tipY + 5}
                textAnchor="middle"
                fontSize={14}
                fontWeight="700"
                fill={color}
              >
                {placement.itemNo}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

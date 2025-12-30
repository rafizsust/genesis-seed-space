import { cn } from '@/lib/utils';

// Chart data types for different visual types
export interface ChartDataItem {
  label: string;
  value: number;
  color?: string;
}

export interface LineDataPoint {
  x: string | number;
  y: number;
}

export interface LineSeriesData {
  name: string;
  data: LineDataPoint[];
  color?: string;
}

export interface TableCell {
  value: string | number;
  isHeader?: boolean;
}

export interface ProcessStep {
  label: string;
  description?: string;
}

export interface MapFeature {
  label: string;
  type: 'building' | 'road' | 'park' | 'water' | 'other';
  position?: string;
}

export interface MapData {
  before?: { year: string; features: MapFeature[] };
  after?: { year: string; features: MapFeature[] };
  features?: MapFeature[];
}

// Main chart data interface
export interface IELTSChartData {
  type: 'BAR_CHART' | 'LINE_GRAPH' | 'PIE_CHART' | 'TABLE' | 'PROCESS_DIAGRAM' | 'MAP' | 'MIXED_CHARTS';
  title: string;
  subtitle?: string;
  xAxisLabel?: string;
  yAxisLabel?: string;
  data?: ChartDataItem[];
  series?: LineSeriesData[];
  rows?: TableCell[][];
  headers?: string[];
  steps?: ProcessStep[];
  mapData?: MapData;
  charts?: IELTSChartData[]; // For mixed charts
}

// Default colors for charts - highly distinguishable palette like official IELTS
const CHART_COLORS = [
  '#3366CC', // Strong blue
  '#DC3912', // Strong red
  '#109618', // Strong green
  '#FF9900', // Orange
  '#990099', // Purple
  '#0099C6', // Teal
  '#DD4477', // Pink
  '#66AA00', // Lime green
];

interface IELTSVisualRendererProps {
  chartData: IELTSChartData | null | undefined;
  fallbackDescription?: string;
  className?: string;
  maxWidth?: number;
  maxHeight?: number;
}

/**
 * Renders IELTS Task 1 visuals from JSON data using CSS.
 * Handles: Bar Charts, Line Graphs, Pie Charts, Tables, Process Diagrams, Maps, Mixed Charts
 */
export function IELTSVisualRenderer({
  chartData,
  fallbackDescription = 'Visual data not available',
  className = '',
  maxWidth = 600,
  maxHeight = 400,
}: IELTSVisualRendererProps) {
  
  // Show placeholder if no data
  if (!chartData || !chartData.type) {
    return (
      <div 
        className={cn(
          'flex flex-col items-center justify-center p-6 bg-muted/30 border border-border rounded-lg text-center',
          className
        )}
        style={{ maxWidth, minHeight: 200 }}
      >
        <div className="text-muted-foreground text-sm mb-2">📊</div>
        <p className="text-sm text-muted-foreground">{fallbackDescription}</p>
      </div>
    );
  }

  const getColor = (index: number, customColor?: string) => 
    customColor || CHART_COLORS[index % CHART_COLORS.length];

  // Render based on chart type
  const renderChart = () => {
    switch (chartData.type) {
      case 'BAR_CHART':
        return <BarChartRenderer data={chartData} getColor={getColor} />;
      case 'LINE_GRAPH':
        return <LineGraphRenderer data={chartData} getColor={getColor} />;
      case 'PIE_CHART':
        return <PieChartRenderer data={chartData} getColor={getColor} />;
      case 'TABLE':
        return <TableRenderer data={chartData} />;
      case 'PROCESS_DIAGRAM':
        return <ProcessDiagramRenderer data={chartData} />;
      case 'MAP':
        return <MapRenderer data={chartData} />;
      case 'MIXED_CHARTS':
        return <MixedChartsRenderer data={chartData} getColor={getColor} />;
      default:
        return (
          <div className="text-center text-muted-foreground p-4">
            <p>Unknown chart type: {chartData.type}</p>
            <p className="text-xs mt-2">{fallbackDescription}</p>
          </div>
        );
    }
  };

  return (
    <div 
      className={cn('bg-background border border-border rounded-lg p-4', className)}
      style={{ maxWidth, maxHeight: maxHeight === 400 ? 'auto' : maxHeight }}
    >
      {chartData.title && (
        <h3 className="text-base font-semibold text-center mb-1 text-foreground">
          {chartData.title}
        </h3>
      )}
      {chartData.subtitle && (
        <p className="text-xs text-muted-foreground text-center mb-3">
          {chartData.subtitle}
        </p>
      )}
      {renderChart()}
    </div>
  );
}

// Bar Chart Renderer (IELTS-style: vertical bars with percentage Y-axis and grid lines)
function BarChartRenderer({ 
  data, 
  getColor,
  isGrouped = false,
}: { 
  data: IELTSChartData; 
  getColor: (index: number, color?: string) => string;
  isGrouped?: boolean;
}) {
  const items = (data.data || []).filter(d => d?.label && typeof d.value === 'number');
  if (items.length === 0) {
    return (
      <div className="text-center text-muted-foreground text-sm">
        Bar chart data not available
      </div>
    );
  }

  const maxValue = Math.max(...items.map(d => d.value), 1);
  // Round up to nice tick value
  const niceMax = Math.ceil(maxValue / 10) * 10 || 100;
  const tickCount = 5;
  const tickStep = niceMax / tickCount;
  const ticks = Array.from({ length: tickCount + 1 }, (_, i) => i * tickStep);

  const W = 560;
  const H = 320;
  const pad = { left: 50, right: 20, top: 20, bottom: 60 };
  const innerW = W - pad.left - pad.right;
  const innerH = H - pad.top - pad.bottom;

  const barWidth = Math.min(50, (innerW / items.length) * 0.6);
  const barGap = (innerW - barWidth * items.length) / (items.length + 1);

  const xAt = (i: number) => pad.left + barGap + i * (barWidth + barGap) + barWidth / 2;
  const yAt = (v: number) => pad.top + (1 - v / niceMax) * innerH;

  return (
    <div className="space-y-2">
      {data.yAxisLabel && (
        <div className="text-xs text-muted-foreground text-center">{data.yAxisLabel}</div>
      )}

      <div className="w-full overflow-x-auto">
        <svg
          className="block mx-auto"
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-label={data.title || 'Bar chart'}
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Horizontal grid lines */}
          {ticks.map((v, idx) => {
            const y = yAt(v);
            return (
              <g key={idx}>
                <line
                  x1={pad.left}
                  y1={y}
                  x2={W - pad.right}
                  y2={y}
                  stroke="#333"
                  strokeWidth={0.5}
                />
                <text
                  x={pad.left - 8}
                  y={y + 4}
                  textAnchor="end"
                  fontSize={11}
                  fill="#666"
                >
                  {v}%
                </text>
              </g>
            );
          })}

          {/* Y-axis */}
          <line
            x1={pad.left}
            y1={pad.top}
            x2={pad.left}
            y2={H - pad.bottom}
            stroke="#333"
            strokeWidth={1}
          />
          {/* X-axis */}
          <line
            x1={pad.left}
            y1={H - pad.bottom}
            x2={W - pad.right}
            y2={H - pad.bottom}
            stroke="#333"
            strokeWidth={1}
          />

          {/* Bars */}
          {items.map((item, idx) => {
            const x = xAt(idx);
            const barH = (item.value / niceMax) * innerH;
            const y = H - pad.bottom - barH;
            return (
              <g key={idx}>
                <rect
                  x={x - barWidth / 2}
                  y={y}
                  width={barWidth}
                  height={barH}
                  fill={getColor(idx, item.color)}
                />
              </g>
            );
          })}

          {/* X-axis labels */}
          {items.map((item, idx) => {
            const x = xAt(idx);
            return (
              <text
                key={idx}
                x={x}
                y={H - pad.bottom + 16}
                textAnchor="middle"
                fontSize={10}
                fill="#333"
              >
                {item.label.length > 12 ? item.label.slice(0, 11) + '…' : item.label}
              </text>
            );
          })}
        </svg>
      </div>

      {/* Legend for grouped bars */}
      {isGrouped && items.length > 0 && (
        <div className="flex flex-wrap gap-4 justify-center">
          {items.map((item, idx) => (
            <div key={idx} className="flex items-center gap-2 text-xs">
              <div
                className="w-4 h-3"
                style={{ backgroundColor: getColor(idx, item.color) }}
              />
              <span className="text-foreground">{item.label}</span>
            </div>
          ))}
        </div>
      )}

      {data.xAxisLabel && (
        <div className="text-xs text-muted-foreground text-center">{data.xAxisLabel}</div>
      )}
    </div>
  );
}


// Line Graph Renderer (IELTS-style: thick lines, distinct colors, percentage Y-axis, grid lines)
function LineGraphRenderer({
  data,
  getColor,
}: {
  data: IELTSChartData;
  getColor: (index: number, color?: string) => string;
}) {
  const series = (data.series || []).filter((s) => Array.isArray(s.data) && s.data.length > 0);

  if (series.length === 0) {
    return (
      <div className="text-center text-muted-foreground text-sm">
        Line graph data not available
      </div>
    );
  }

  const allPoints = series.flatMap((s) => s.data);
  const allY = allPoints.map((p) => p.y);
  const minY = Math.min(...allY);
  const maxY = Math.max(...allY);
  
  // Round to nice tick values (0, 10, 20... or 0, 20, 40...)
  const rawMin = Math.floor(minY / 10) * 10;
  const rawMax = Math.ceil(maxY / 10) * 10;
  const yMin = Math.max(0, rawMin - 10);
  const yMax = rawMax + 10;
  const yRange = yMax - yMin || 1;

  // Use x labels from the longest series
  const xLabels = [...series]
    .sort((a, b) => (b.data?.length || 0) - (a.data?.length || 0))[0]
    ?.data.map((d) => String(d.x)) ?? [];

  const W = 600;
  const H = 340;
  const pad = { left: 56, right: 130, top: 20, bottom: 50 };
  const innerW = W - pad.left - pad.right;
  const innerH = H - pad.top - pad.bottom;

  const xCount = Math.max(2, xLabels.length);
  const xStep = xCount > 1 ? innerW / (xCount - 1) : innerW;

  const xAt = (i: number) => pad.left + i * xStep;
  const yAt = (y: number) => pad.top + (1 - (y - yMin) / yRange) * innerH;

  // Y-axis ticks: 0%, 10%, 20%... up to max
  const tickStep = yRange <= 50 ? 10 : 20;
  const tickValues: number[] = [];
  for (let v = yMin; v <= yMax; v += tickStep) {
    tickValues.push(v);
  }

  return (
    <div className="space-y-3">
      {data.yAxisLabel && (
        <div className="text-xs text-muted-foreground text-center">
          {data.yAxisLabel}
        </div>
      )}

      <div className="w-full overflow-x-auto">
        <svg
          className="block mx-auto"
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-label={data.title || 'Line graph'}
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Horizontal grid lines + Y-axis labels */}
          {tickValues.map((v, idx) => {
            const y = yAt(v);
            return (
              <g key={idx}>
                <line
                  x1={pad.left}
                  y1={y}
                  x2={W - pad.right}
                  y2={y}
                  stroke="#333"
                  strokeWidth={0.5}
                />
                <text
                  x={pad.left - 10}
                  y={y + 4}
                  textAnchor="end"
                  fontSize={12}
                  fill="#333"
                >
                  {v}%
                </text>
              </g>
            );
          })}

          {/* Vertical grid lines at each X point */}
          {xLabels.map((_, i) => {
            const x = xAt(i);
            return (
              <line
                key={i}
                x1={x}
                y1={pad.top}
                x2={x}
                y2={H - pad.bottom}
                stroke="#ccc"
                strokeWidth={0.5}
              />
            );
          })}

          {/* Axes */}
          <line
            x1={pad.left}
            y1={pad.top}
            x2={pad.left}
            y2={H - pad.bottom}
            stroke="#333"
            strokeWidth={1.5}
          />
          <line
            x1={pad.left}
            y1={H - pad.bottom}
            x2={W - pad.right}
            y2={H - pad.bottom}
            stroke="#333"
            strokeWidth={1.5}
          />

          {/* X labels */}
          {xLabels.map((label, i) => {
            const x = xAt(i);
            const y = H - pad.bottom + 22;
            return (
              <text
                key={i}
                x={x}
                y={y}
                textAnchor="middle"
                fontSize={12}
                fontWeight={500}
                fill="#333"
              >
                {label}
              </text>
            );
          })}

          {/* Series - thick lines with distinct colors */}
          {series.map((s, sIdx) => {
            const color = getColor(sIdx, s.color);
            const pts = s.data
              .map((p, i) => {
                const xi = xLabels.findIndex((x) => String(x) === String(p.x));
                const xIndex = xi >= 0 ? xi : i;
                return { x: xAt(xIndex), y: yAt(p.y), raw: p };
              })
              .sort((a, b) => a.x - b.x);

            const d = pts
              .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
              .join(' ');

            return (
              <g key={sIdx}>
                <path d={d} fill="none" stroke={color} strokeWidth={3} />
                {pts.map((p, idx) => (
                  <circle
                    key={idx}
                    cx={p.x}
                    cy={p.y}
                    r={5}
                    fill={color}
                    stroke="#fff"
                    strokeWidth={2}
                  >
                    <title>{`${s.name}: ${p.raw.y}%`}</title>
                  </circle>
                ))}
              </g>
            );
          })}

          {/* Legend - on right side like official IELTS */}
          {series.length > 0 && (
            <g>
              {series.map((s, idx) => {
                const y = pad.top + 40 + idx * 28;
                const color = getColor(idx, s.color);
                return (
                  <g key={idx}>
                    <line
                      x1={W - pad.right + 20}
                      y1={y}
                      x2={W - pad.right + 45}
                      y2={y}
                      stroke={color}
                      strokeWidth={3}
                    />
                    <text
                      x={W - pad.right + 50}
                      y={y + 4}
                      fontSize={12}
                      fontWeight={500}
                      fill={color}
                    >
                      {s.name}
                    </text>
                  </g>
                );
              })}
            </g>
          )}
        </svg>
      </div>

      {data.xAxisLabel && (
        <div className="text-xs text-muted-foreground text-center">{data.xAxisLabel}</div>
      )}
    </div>
  );
}

// Pie Chart Renderer (with percentage labels inside slices like IELTS)
function PieChartRenderer({
  data,
  getColor,
}: {
  data: IELTSChartData;
  getColor: (index: number, color?: string) => string;
}) {
  const items = (data.data || []).filter((d) => d?.label && typeof d.value === 'number');
  if (items.length === 0) {
    return (
      <div className="text-center text-muted-foreground text-sm">
        Pie chart data not available
      </div>
    );
  }
  const total = items.reduce((sum, item) => sum + item.value, 0) || 1;

  // Calculate segment angles
  let currentAngle = -90; // start at 12 o'clock
  const segments = items.map((item, idx) => {
    const percentage = (item.value / total) * 100;
    const angle = (item.value / total) * 360;
    const segment = {
      ...item,
      percentage,
      startAngle: currentAngle,
      midAngle: currentAngle + angle / 2,
      endAngle: currentAngle + angle,
      color: getColor(idx, item.color),
    };
    currentAngle += angle;
    return segment;
  });

  const R = 80; // outer radius
  const cx = 100;
  const cy = 100;

  // Arc path helper
  const arc = (start: number, end: number, r: number) => {
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const x1 = cx + r * Math.cos(toRad(start));
    const y1 = cy + r * Math.sin(toRad(start));
    const x2 = cx + r * Math.cos(toRad(end));
    const y2 = cy + r * Math.sin(toRad(end));
    const largeArc = end - start > 180 ? 1 : 0;
    return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
  };

  const labelPos = (angle: number, dist: number) => {
    const rad = (angle * Math.PI) / 180;
    return { x: cx + dist * Math.cos(rad), y: cy + dist * Math.sin(rad) };
  };

  return (
    <div className="flex flex-col items-center gap-4">
      {/* SVG pie */}
      <svg
        viewBox="0 0 200 200"
        className="w-44 h-44"
        role="img"
        aria-label={data.title || 'Pie chart'}
      >
        {segments.map((s, idx) => (
          <g key={idx}>
            <path d={arc(s.startAngle, s.endAngle, R)} fill={s.color} />
            {/* Label if slice is big enough */}
            {s.percentage >= 6 && (() => {
              const pos = labelPos(s.midAngle, R * 0.65);
              return (
                <text
                  x={pos.x}
                  y={pos.y + 4}
                  textAnchor="middle"
                  fontSize={11}
                  fontWeight={600}
                  fill="#fff"
                >
                  {s.percentage.toFixed(0)}%
                </text>
              );
            })()}
          </g>
        ))}
      </svg>

      {/* Legend */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
        {segments.map((segment, idx) => (
          <div key={idx} className="flex items-center gap-2 text-xs">
            <div
              className="w-3 h-3 rounded-sm flex-shrink-0"
              style={{ backgroundColor: segment.color }}
            />
            <span className="text-muted-foreground truncate">
              {segment.label}: {segment.percentage.toFixed(0)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Table Renderer
function TableRenderer({ data }: { data: IELTSChartData }) {
  const headers = data.headers || [];
  const rows = data.rows || [];

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse">
        {headers.length > 0 && (
          <thead>
            <tr>
              {headers.map((header, idx) => (
                <th 
                  key={idx}
                  className="bg-muted/50 border border-border px-2 py-1.5 text-left font-medium text-foreground"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {rows.map((row, rowIdx) => (
            <tr key={rowIdx}>
              {row.map((cell, cellIdx) => (
                <td 
                  key={cellIdx}
                  className={cn(
                    'border border-border px-2 py-1.5',
                    cell.isHeader ? 'bg-muted/30 font-medium' : 'bg-background'
                  )}
                >
                  {cell.value}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Process Diagram Renderer
function ProcessDiagramRenderer({ data }: { data: IELTSChartData }) {
  const steps = (data.steps || []).filter((s) => s?.label);

  if (steps.length === 0) {
    return (
      <div className="text-center text-muted-foreground text-sm">
        Process diagram data not available
      </div>
    );
  }

  // Prefer a circular/ring layout (closer to IELTS) when the diagram is a short sequence.
  const useRing = steps.length >= 4 && steps.length <= 10;

  if (!useRing) {
    return (
      <div className="flex flex-col gap-2">
        {steps.map((step, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <div className="flex-1 bg-muted/30 border border-border rounded-lg px-3 py-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">
                  {idx + 1}
                </span>
                <span className="text-sm font-medium text-foreground">{step.label}</span>
              </div>
              {step.description && (
                <p className="text-xs text-muted-foreground mt-1 pl-8">{step.description}</p>
              )}
            </div>
            {idx < steps.length - 1 && (
              <div className="text-muted-foreground text-lg">↓</div>
            )}
          </div>
        ))}
      </div>
    );
  }

  const W = 760;
  const H = 360;
  const cx = W / 2;
  const cy = H / 2;
  const ringR = 120;
  const nodeR = 18;

  const angleFor = (i: number) => (-Math.PI / 2) + (i * 2 * Math.PI) / steps.length;
  const nodeAt = (i: number) => {
    const a = angleFor(i);
    return { x: cx + ringR * Math.cos(a), y: cy + ringR * Math.sin(a) };
  };

  return (
    <div className="space-y-3">
      <div className="w-full overflow-x-auto">
        <svg
          className="block mx-auto"
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-label={data.title || 'Process diagram'}
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Ring */}
          <circle
            cx={cx}
            cy={cy}
            r={ringR}
            fill="none"
            stroke="hsl(var(--border))"
            strokeOpacity={0.7}
            strokeWidth={2}
          />

          {/* Arrows */}
          <defs>
            <marker
              id="arrow"
              markerWidth="10"
              markerHeight="10"
              refX="8"
              refY="3"
              orient="auto"
              markerUnits="strokeWidth"
            >
              <path d="M0,0 L0,6 L9,3 z" fill="hsl(var(--muted-foreground))" />
            </marker>
          </defs>

          {steps.map((_, i) => {
            const a = nodeAt(i);
            const b = nodeAt((i + 1) % steps.length);
            // Draw a slightly inset chord so arrows don't overlap nodes
            const inset = 12;
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const len = Math.max(1, Math.sqrt(dx * dx + dy * dy));
            const ax = a.x + (dx / len) * inset;
            const ay = a.y + (dy / len) * inset;
            const bx = b.x - (dx / len) * inset;
            const by = b.y - (dy / len) * inset;
            return (
              <line
                key={i}
                x1={ax}
                y1={ay}
                x2={bx}
                y2={by}
                stroke="hsl(var(--muted-foreground))"
                strokeOpacity={0.7}
                strokeWidth={1.5}
                markerEnd="url(#arrow)"
              />
            );
          })}

          {/* Nodes + numbers */}
          {steps.map((step, i) => {
            const p = nodeAt(i);
            return (
              <g key={i}>
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={nodeR}
                  fill="hsl(var(--primary) / 0.12)"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                />
                <text
                  x={p.x}
                  y={p.y + 5}
                  textAnchor="middle"
                  fontSize={12}
                  fontWeight={700}
                  fill="hsl(var(--primary))"
                >
                  {i + 1}
                </text>
                <title>{step.label}</title>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Step captions (IELTS-style, readable) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {steps.map((step, idx) => (
          <div key={idx} className="bg-muted/20 border border-border rounded-lg px-3 py-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">
                {idx + 1}
              </span>
              <span className="text-sm font-medium text-foreground">{step.label}</span>
            </div>
            {step.description && (
              <p className="text-xs text-muted-foreground mt-1 pl-8">{step.description}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// Map Renderer (simplified list view)
function MapRenderer({ data }: { data: IELTSChartData }) {
  const mapData = data.mapData;
  
  if (!mapData) {
    return <div className="text-center text-muted-foreground text-sm">Map data not available</div>;
  }

  const renderFeatures = (features: MapFeature[], year?: string) => (
    <div className="flex-1 bg-muted/20 border border-border rounded-lg p-3">
      {year && (
        <div className="text-xs font-semibold text-primary mb-2 text-center">{year}</div>
      )}
      <div className="space-y-1">
        {features.map((feature, idx) => (
          <div key={idx} className="flex items-center gap-2 text-xs">
            <span className={cn(
              'w-2 h-2 rounded-sm',
              feature.type === 'building' && 'bg-amber-500',
              feature.type === 'road' && 'bg-slate-500',
              feature.type === 'park' && 'bg-green-500',
              feature.type === 'water' && 'bg-blue-500',
              feature.type === 'other' && 'bg-gray-400',
            )} />
            <span className="text-foreground">{feature.label}</span>
            {feature.position && (
              <span className="text-muted-foreground">({feature.position})</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  // Side-by-side comparison if before/after exists
  if (mapData.before && mapData.after) {
    return (
      <div className="flex gap-4">
        {renderFeatures(mapData.before.features, mapData.before.year)}
        <div className="flex items-center text-muted-foreground">→</div>
        {renderFeatures(mapData.after.features, mapData.after.year)}
      </div>
    );
  }

  // Single map
  if (mapData.features) {
    return renderFeatures(mapData.features);
  }

  return <div className="text-center text-muted-foreground text-sm">Map configuration not recognized</div>;
}

// Mixed Charts Renderer (IELTS-style: stacked vertically, not side-by-side)
function MixedChartsRenderer({
  data,
  getColor,
}: {
  data: IELTSChartData;
  getColor: (index: number, color?: string) => string;
}) {
  const charts = data.charts || [];

  if (charts.length === 0) {
    return <div className="text-center text-muted-foreground text-sm">No charts to display</div>;
  }

  return (
    <div className="flex flex-col gap-6">
      {charts.map((chart, idx) => (
        <div key={idx} className="border border-border rounded-lg p-4 bg-white">
          {chart.title && (
            <h4 className="text-sm font-semibold text-center mb-4 text-gray-800">{chart.title}</h4>
          )}
          {chart.type === 'BAR_CHART' && <BarChartRenderer data={chart} getColor={getColor} />}
          {chart.type === 'LINE_GRAPH' && <LineGraphRenderer data={chart} getColor={getColor} />}
          {chart.type === 'PIE_CHART' && <PieChartRenderer data={chart} getColor={getColor} />}
          {chart.type === 'TABLE' && <TableRenderer data={chart} />}
        </div>
      ))}
    </div>
  );
}

export default IELTSVisualRenderer;

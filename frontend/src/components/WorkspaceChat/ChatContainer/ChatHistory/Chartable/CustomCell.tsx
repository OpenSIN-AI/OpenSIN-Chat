// SPDX-License-Identifier: MIT
export default function CustomCell({ ...props }: any) {
  const { root, depth, x, y, width, height, index, colors, name } = props;
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        className="fill-[var(--cell-fill)] stroke-[var(--cell-stroke)] stroke-[var(--cell-stroke-width)] stroke-opacity-[var(--cell-stroke-opacity)]"
        style={{
          "--cell-fill":
            depth < 2
              ? colors[Math.floor((index / root.children.length) * 6)]
              : "#ffffff00",
          "--cell-stroke": "#fff",
          "--cell-stroke-width": 2 / (depth + 1e-10),
          "--cell-stroke-opacity": 1 / (depth + 1e-10),
        }}
      />
      {depth === 1 ? (
        <text
          x={x + width / 2}
          y={y + height / 2 + 7}
          textAnchor="middle"
          fill="#fff"
          fontSize={14}
        >
          {name}
        </text>
      ) : null}
      {depth === 1 ? (
        <text x={x + 4} y={y + 18} fill="#fff" fontSize={16} fillOpacity={0.9}>
          {index + 1}
        </text>
      ) : null}
    </g>
  );
}

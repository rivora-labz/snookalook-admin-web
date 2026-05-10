"use client";

import { AreaChart, Area, ResponsiveContainer } from "recharts";

interface Props {
  data: Array<Record<string, number>>;
  stroke?: string;
  fillId?: string;
  fillOpacityStart?: number;
  height?: number;
  dataKey?: "val" | "v";
}

export default function SparklineArea({
  data,
  stroke = "#D4AF37",
  fillId = "goldGradient",
  fillOpacityStart = 0.3,
  height = 40,
  dataKey = "val",
}: Props) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 0, bottom: 0, left: 0, right: 0 }}>
        <defs>
          <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={stroke} stopOpacity={fillOpacityStart} />
            <stop offset="95%" stopColor={stroke} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey={dataKey}
          stroke={stroke}
          fill={`url(#${fillId})`}
          strokeWidth={1.5}
          dot={false}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

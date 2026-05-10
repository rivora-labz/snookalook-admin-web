"use client";

import { LineChart, Line, ResponsiveContainer } from "recharts";

interface Props {
  data: { i: number; v: number }[];
  stroke?: string;
  height?: number;
}

export default function SparklineLine({ data, stroke = "#D4AF37", height = 40 }: Props) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 0, bottom: 0, left: 0, right: 0 }}>
        <Line
          type="monotone"
          dataKey="v"
          stroke={stroke}
          dot={false}
          strokeWidth={1.5}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

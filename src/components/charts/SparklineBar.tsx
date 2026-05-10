"use client";

import { BarChart, Bar, ResponsiveContainer } from "recharts";

interface Props {
  data: { i: number; v: number }[];
  fill?: string;
  height?: number;
}

export default function SparklineBar({ data, fill = "#3498DB", height = 40 }: Props) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 0, bottom: 0, left: 0, right: 0 }}>
        <Bar dataKey="v" fill={fill} radius={[2, 2, 0, 0]} isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  );
}

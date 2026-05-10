"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

interface Slice {
  id: string;
  name: string;
  value: number;
  color: string;
}

interface Props {
  data: Slice[];
}

export default function SourcePieChart({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={80}
          outerRadius={110}
          paddingAngle={2}
          dataKey="value"
          stroke="none"
          isAnimationActive={false}
        >
          {data.map((entry) => (
            <Cell key={entry.id} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{ backgroundColor: "var(--th-card)", border: "1px solid var(--th-border-medium)", borderRadius: "8px" }}
          itemStyle={{ color: "var(--th-text)" }}
          formatter={(value) => [`${value}%`, "Source"]}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

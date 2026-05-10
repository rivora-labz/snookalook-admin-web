"use client";

import {
  BarChart,
  Bar,
  Cell,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

interface DataPoint {
  hour: string;
  utilization: number;
  isPeak: boolean;
}

interface Props {
  data: DataPoint[];
  greenId?: string;
  goldId?: string;
}

export default function UtilizationBarChart({
  data,
  greenId = "barGreen-analytics",
  goldId = "barGold-analytics",
}: Props) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
        <defs>
          <linearGradient id={greenId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2ECC71" />
            <stop offset="100%" stopColor="#0B3D2E" />
          </linearGradient>
          <linearGradient id={goldId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#F7D774" />
            <stop offset="100%" stopColor="#D4AF37" />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--th-border)" />
        <XAxis dataKey="hour" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#808080" }} tickMargin={10} />
        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#808080" }} domain={[0, 100]} />
        <Tooltip
          cursor={{ fill: "rgba(255,255,255,0.05)" }}
          contentStyle={{ backgroundColor: "var(--th-card)", border: "1px solid var(--th-border-medium)", borderRadius: "8px" }}
          itemStyle={{ color: "var(--th-text)" }}
          formatter={(value) => [`${value}%`, "Utilization"]}
        />
        <Bar dataKey="utilization" radius={[4, 4, 0, 0]} isAnimationActive={false}>
          {data.map((entry) => (
            <Cell key={entry.hour} fill={entry.isPeak ? `url(#${goldId})` : `url(#${greenId})`} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

"use client";

import {
  AreaChart,
  Area,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { formatAED } from "../../lib/currency";

interface Props {
  data: Array<Record<string, number | string>>;
  fillId?: string;
  stroke?: string;
}

export default function RevenueAreaChart({
  data,
  fillId = "colorValue-analytics",
  stroke = "#D4AF37",
}: Props) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={stroke} stopOpacity={0.4} />
            <stop offset="95%" stopColor={stroke} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--th-border)" />
        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#808080" }} tickMargin={10} />
        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#808080" }} />
        <Tooltip
          contentStyle={{ backgroundColor: "var(--th-card)", border: "1px solid var(--th-border-medium)", borderRadius: "8px" }}
          itemStyle={{ color: stroke, fontWeight: "bold" }}
          formatter={(value) => [formatAED(Number(value) * 100, { decimals: 0 }), "Revenue"]}
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke={stroke}
          strokeWidth={2}
          fillOpacity={1}
          fill={`url(#${fillId})`}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

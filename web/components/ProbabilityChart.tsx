"use client";

import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { PricePoint } from "@/lib/types";

export function ProbabilityChart({
  data,
  label = "Probability",
}: {
  data: PricePoint[];
  label?: string;
}) {
  if (data.length < 2) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-muted">
        Not enough trading history yet.
      </div>
    );
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 8, right: 8, bottom: 0, left: -16 }}
        >
          <defs>
            <linearGradient id="yesFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#16c060" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#16c060" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="t"
            type="number"
            domain={["dataMin", "dataMax"]}
            tickFormatter={(t) =>
              new Date(t).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })
            }
            tick={{ fill: "#7c8a7c", fontSize: 11 }}
            stroke="#23302a"
            minTickGap={48}
          />
          <YAxis
            domain={[0, 100]}
            tickFormatter={(v) => `${v}%`}
            tick={{ fill: "#7c8a7c", fontSize: 11 }}
            stroke="#23302a"
            width={44}
          />
          <Tooltip
            contentStyle={{
              background: "#121712",
              border: "1px solid #23302a",
              borderRadius: 8,
              fontSize: 12,
            }}
            labelFormatter={(t) => new Date(Number(t)).toLocaleString()}
            formatter={(v: number | string) => [`${v}%`, label]}
          />
          <Area
            type="monotone"
            dataKey="p"
            stroke="#3cf08a"
            strokeWidth={2}
            fill="url(#yesFill)"
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

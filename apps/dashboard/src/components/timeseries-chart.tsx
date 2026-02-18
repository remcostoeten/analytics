"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { format } from "date-fns";

type TimeseriesPoint = {
  ts: Date;
  count: number;
};

type TimeseriesChartProps = {
  data: TimeseriesPoint[];
  height?: number;
};

export function TimeseriesChart({ data, height = 300 }: TimeseriesChartProps) {
  const chartData = data.map((point) => ({
    ts: point.ts instanceof Date ? point.ts.getTime() : new Date(point.ts).getTime(),
    count: point.count,
    label: point.ts instanceof Date ? format(point.ts, "MMM d") : format(new Date(point.ts), "MMM d"),
  }));

  if (chartData.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-muted-foreground"
        style={{ height }}
      >
        No data available for this period
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
        <XAxis
          dataKey="label"
          stroke="hsl(var(--muted-foreground))"
          fontSize={12}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          stroke="hsl(var(--muted-foreground))"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => {
            if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
            if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
            return value.toString();
          }}
        />
        <Tooltip
          content={({ active, payload }) => {
            if (!active || !payload || payload.length === 0) return null;

            const data = payload[0];
            const date = new Date(data.payload.ts);

            return (
              <div className="rounded-lg border bg-background p-3 shadow-lg">
                <p className="text-sm text-muted-foreground mb-1">
                  {format(date, "MMM d, yyyy")}
                </p>
                <p className="text-lg font-semibold">
                  {data.value?.toLocaleString()} views
                </p>
              </div>
            );
          }}
        />
        <Line
          type="monotone"
          dataKey="count"
          stroke="hsl(var(--primary))"
          strokeWidth={2}
          dot={false}
          activeDot={{
            r: 4,
            fill: "hsl(var(--primary))",
            stroke: "hsl(var(--background))",
            strokeWidth: 2,
          }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

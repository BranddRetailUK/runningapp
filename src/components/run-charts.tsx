"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatPace } from "@/lib/run-metrics";
import type { ChartPoint } from "@/lib/types";

const tooltipStyle = {
  background: "#13231f",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 14,
  color: "#f5f7f5",
  boxShadow: "0 18px 50px rgba(0,0,0,0.34)",
};

export function RunCharts({ data }: { data: ChartPoint[] }) {
  if (data.length === 0) {
    return (
      <section className="empty-chart">
        <span className="empty-chart-line" />
        <h3>Your first trend starts with one run.</h3>
        <p>Upload today&apos;s screenshot to populate distance, calories, and pace charts.</p>
      </section>
    );
  }

  return (
    <section className="charts-grid">
      <article className="chart-card chart-card-wide">
        <div className="chart-card-header">
          <div>
            <span className="chart-kicker lime-dot">Distance</span>
            <h3>Distance over time</h3>
          </div>
          <p>km per period</p>
        </div>
        <div className="chart-area">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 12, right: 4, left: -24, bottom: 0 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.07)" vertical={false} />
              <XAxis
                axisLine={false}
                dataKey="label"
                minTickGap={20}
                tick={{ fill: "#84948e", fontSize: 12 }}
                tickLine={false}
              />
              <YAxis
                axisLine={false}
                tick={{ fill: "#84948e", fontSize: 12 }}
                tickLine={false}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                cursor={{ fill: "rgba(223,248,106,0.05)" }}
                formatter={(value) => [`${Number(value).toFixed(2)} km`, "Distance"]}
                labelFormatter={(_, payload) => payload[0]?.payload.fullLabel ?? ""}
              />
              <Bar dataKey="distance" fill="#dff86a" radius={[8, 8, 3, 3]} maxBarSize={34} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </article>

      <article className="chart-card">
        <div className="chart-card-header">
          <div>
            <span className="chart-kicker coral-dot">Energy</span>
            <h3>Calories burned</h3>
          </div>
          <p>kcal</p>
        </div>
        <div className="chart-area">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 12, right: 4, left: -28, bottom: 0 }}>
              <defs>
                <linearGradient id="calorieFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ff9179" stopOpacity={0.42} />
                  <stop offset="100%" stopColor="#ff9179" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(255,255,255,0.07)" vertical={false} />
              <XAxis
                axisLine={false}
                dataKey="label"
                minTickGap={22}
                tick={{ fill: "#84948e", fontSize: 12 }}
                tickLine={false}
              />
              <YAxis
                axisLine={false}
                tick={{ fill: "#84948e", fontSize: 12 }}
                tickLine={false}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(value) => [`${Math.round(Number(value))} kcal`, "Calories"]}
                labelFormatter={(_, payload) => payload[0]?.payload.fullLabel ?? ""}
              />
              <Area
                dataKey="calories"
                fill="url(#calorieFill)"
                stroke="#ff9179"
                strokeWidth={2.5}
                type="monotone"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </article>

      <article className="chart-card chart-card-wide">
        <div className="chart-card-header">
          <div>
            <span className="chart-kicker blue-dot">Pace</span>
            <h3>Pace progression</h3>
          </div>
          <p>min / km · lower is faster</p>
        </div>
        <div className="chart-area short-chart">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 12, right: 8, left: -14, bottom: 0 }}>
              <defs>
                <linearGradient id="paceFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#77a9ff" stopOpacity={0.28} />
                  <stop offset="100%" stopColor="#77a9ff" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(255,255,255,0.07)" vertical={false} />
              <XAxis
                axisLine={false}
                dataKey="label"
                minTickGap={20}
                tick={{ fill: "#84948e", fontSize: 12 }}
                tickLine={false}
              />
              <YAxis
                axisLine={false}
                domain={["dataMin - 10", "dataMax + 10"]}
                tick={{ fill: "#84948e", fontSize: 12 }}
                tickFormatter={(value) => formatPace(Number(value))}
                tickLine={false}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(value) => [`${formatPace(Number(value))} /km`, "Pace"]}
                labelFormatter={(_, payload) => payload[0]?.payload.fullLabel ?? ""}
              />
              <Area
                dataKey="paceSeconds"
                fill="url(#paceFill)"
                stroke="#77a9ff"
                strokeWidth={2.5}
                type="monotone"
              />
              <Line
                dataKey="paceSeconds"
                dot={{ r: 3, fill: "#08110f", stroke: "#77a9ff", strokeWidth: 2 }}
                stroke="#77a9ff"
                strokeWidth={2.5}
                type="monotone"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </article>

      <article className="chart-card cumulative-card">
        <div className="chart-card-header">
          <div>
            <span className="chart-kicker mint-dot">Momentum</span>
            <h3>Cumulative distance</h3>
          </div>
          <p>km</p>
        </div>
        <div className="cumulative-number">
          {data.at(-1)?.cumulativeDistance.toLocaleString("en-GB", {
            minimumFractionDigits: 1,
            maximumFractionDigits: 1,
          })}
          <span> km</span>
        </div>
        <div className="mini-chart">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="cumulativeFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#5ee6c4" stopOpacity={0.34} />
                  <stop offset="100%" stopColor="#5ee6c4" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                dataKey="cumulativeDistance"
                fill="url(#cumulativeFill)"
                stroke="#5ee6c4"
                strokeWidth={2.5}
                type="monotone"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </article>
    </section>
  );
}

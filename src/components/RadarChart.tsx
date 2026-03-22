import {
	Legend,
	PolarAngleAxis,
	PolarGrid,
	PolarRadiusAxis,
	Radar,
	RadarChart,
	ResponsiveContainer,
	Tooltip,
} from "recharts";
import { getOptionColor } from "../lib/chart-colors";
import type { Criterion, OptionScore } from "../types";

type RadarChartWrapperProps = {
	rankings: OptionScore[];
	criteria: Criterion[];
	weightOverrides: Record<number, number>;
	visibleOptionIds: number[];
};

export function RadarChartWrapper({
	rankings,
	criteria,
	weightOverrides,
	visibleOptionIds,
}: RadarChartWrapperProps) {
	const visibleRankings = rankings.filter((r) =>
		visibleOptionIds.includes(r.optionId),
	);

	const data = criteria.map((c) => {
		const point: Record<string, string | number> = {
			criterion: `${c.name} (w: ${(weightOverrides[c.id] ?? c.weight).toFixed(1)})`,
		};
		for (const r of visibleRankings) {
			point[r.optionName] = r.scores[c.id] ?? 0;
		}
		return point;
	});

	if (criteria.length < 3) {
		return (
			<div className="flex items-center justify-center h-64 text-slate-500 text-sm">
				At least 3 criteria needed for radar chart
			</div>
		);
	}

	return (
		<ResponsiveContainer width="100%" height={350}>
			<RadarChart data={data}>
				<PolarGrid stroke="#334155" />
				<PolarAngleAxis
					dataKey="criterion"
					tick={{ fill: "#94a3b8", fontSize: 11 }}
				/>
				<PolarRadiusAxis
					domain={[0, 10]}
					tick={{ fill: "#64748b", fontSize: 10 }}
				/>
				{visibleRankings.map((r, i) => (
					<Radar
						key={r.optionId}
						name={r.optionName}
						dataKey={r.optionName}
						stroke={getOptionColor(i)}
						fill={getOptionColor(i)}
						fillOpacity={0.15}
					/>
				))}
				<Legend wrapperStyle={{ color: "#94a3b8", fontSize: 12 }} />
				<Tooltip
					contentStyle={{
						backgroundColor: "#1e293b",
						border: "1px solid #334155",
						borderRadius: "8px",
						color: "#f1f5f9",
					}}
				/>
			</RadarChart>
		</ResponsiveContainer>
	);
}

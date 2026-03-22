import { useState } from "react";
import {
	Bar,
	BarChart,
	Cell,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import { getOptionColor } from "../lib/chart-colors";
import { useAppStore } from "../store/app-store";
import { useDecisionStore } from "../store/decision-store";
import {
	useRankChanges,
	useSensitivityRanking,
	useSensitivityStore,
} from "../store/sensitivity-store";
import { CriteriaWeightSlider } from "./CriteriaWeightSlider";
import { EmptyState } from "./EmptyState";
import { RadarChartWrapper } from "./RadarChart";
import { RankChangeAlert } from "./RankChangeAlert";

export function SensitivityAnalysisView() {
	const [saved, setSaved] = useState(false);

	const decisions = useDecisionStore((s) => s.decisions);
	const activeDecisionId = useDecisionStore((s) => s.activeDecisionId);
	const criteria = useDecisionStore((s) => s.criteria);
	const options = useDecisionStore((s) => s.options);
	const setActiveView = useAppStore((s) => s.setActiveView);

	const weightOverrides = useSensitivityStore((s) => s.weightOverrides);
	const baselineWeights = useSensitivityStore((s) => s.baselineWeights);
	const visibleOptionIds = useSensitivityStore((s) => s.visibleOptionIds);
	const setWeightOverride = useSensitivityStore((s) => s.setWeightOverride);
	const resetToBaseline = useSensitivityStore((s) => s.resetToBaseline);
	const toggleOptionVisibility = useSensitivityStore(
		(s) => s.toggleOptionVisibility,
	);
	const updateBaseline = useSensitivityStore((s) => s.updateBaseline);

	const sensitivityRanking = useSensitivityRanking();
	const rankChanges = useRankChanges();

	const activeDecision = decisions.find((d) => d.id === activeDecisionId);

	const hasChanges = criteria.some(
		(c) =>
			(weightOverrides[c.id] ?? c.weight) !==
			(baselineWeights[c.id] ?? c.weight),
	);

	if (!activeDecision || criteria.length === 0) {
		return (
			<div className="flex flex-1 items-center justify-center">
				<EmptyState
					icon={
						<svg
							width="48"
							height="48"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="1.5"
							strokeLinecap="round"
							strokeLinejoin="round"
						>
							<path d="M3 3v18h18" />
							<path d="M7 12l4-4 4 4 4-4" />
						</svg>
					}
					title="No decision to analyze"
					description="Select a decision with criteria to run sensitivity analysis."
					action={{
						label: "Back to Canvas",
						onClick: () => setActiveView("canvas"),
					}}
				/>
			</div>
		);
	}

	function handleSaveBaseline() {
		const { updateCriterionField } = useDecisionStore.getState();
		for (const [criterionIdStr, weight] of Object.entries(weightOverrides)) {
			updateCriterionField(Number(criterionIdStr), { weight });
		}
		updateBaseline({ ...weightOverrides });
		setSaved(true);
		setTimeout(() => setSaved(false), 1500);
	}

	const sortedRankings = [...sensitivityRanking].sort(
		(a, b) => a.rank - b.rank,
	);

	const barData = sortedRankings.map((r) => ({
		name: r.optionName,
		score: Math.round(r.normalizedScore),
		optionId: r.optionId,
	}));

	return (
		<div className="flex flex-col h-full">
			{/* Header */}
			<header className="px-8 pt-6 pb-4 shrink-0 border-b border-slate-800">
				<h2 className="text-2xl font-bold tracking-tight">
					Sensitivity Analysis
				</h2>
				<p className="text-sm text-slate-400 mt-1">{activeDecision.name}</p>
			</header>

			{/* Main content: 2-panel layout */}
			<div className="flex flex-1 min-h-0">
				{/* Left panel: Sliders */}
				<div className="w-1/3 border-r border-slate-800 overflow-y-auto p-6 flex flex-col gap-5">
					<div className="space-y-4">
						{criteria.map((c) => (
							<CriteriaWeightSlider
								key={c.id}
								criterionName={c.name}
								baselineWeight={baselineWeights[c.id] ?? c.weight}
								currentWeight={weightOverrides[c.id] ?? c.weight}
								onChange={(val) => setWeightOverride(c.id, val)}
							/>
						))}
					</div>

					<button
						onClick={resetToBaseline}
						disabled={!hasChanges}
						className="mt-4 px-4 py-2 rounded-lg text-sm font-medium border border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
					>
						Reset to Baseline
					</button>

					{/* Option visibility toggles */}
					<div className="mt-6">
						<p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
							Chart Visibility
						</p>
						<div className="space-y-1.5">
							{options.map((opt, i) => (
								<label
									key={opt.id}
									className="flex items-center gap-2 text-sm cursor-pointer"
								>
									<input
										type="checkbox"
										checked={visibleOptionIds.includes(opt.id)}
										onChange={() => toggleOptionVisibility(opt.id)}
										className="rounded border-slate-600"
										style={{ accentColor: getOptionColor(i) }}
									/>
									<span
										className="w-2.5 h-2.5 rounded-full shrink-0"
										style={{ backgroundColor: getOptionColor(i) }}
									/>
									<span className="text-slate-300">{opt.name}</span>
								</label>
							))}
						</div>
					</div>
				</div>

				{/* Right panel: Charts */}
				<div className="w-2/3 overflow-y-auto p-6 space-y-6">
					{/* Radar chart */}
					<div className="bg-slate-900/50 rounded-xl p-4">
						<RadarChartWrapper
							rankings={sensitivityRanking}
							criteria={criteria}
							weightOverrides={weightOverrides}
							visibleOptionIds={visibleOptionIds}
						/>
					</div>

					{/* Bar chart */}
					<div className="bg-slate-900/50 rounded-xl p-4">
						<h3 className="text-sm font-semibold text-slate-400 mb-3">
							Ranked Scores
						</h3>
						<ResponsiveContainer
							width="100%"
							height={Math.max(120, barData.length * 40)}
						>
							<BarChart
								data={barData}
								layout="vertical"
								margin={{ left: 0, right: 20 }}
							>
								<XAxis
									type="number"
									domain={[0, 100]}
									tick={{ fill: "#64748b", fontSize: 11 }}
									tickFormatter={(v: number) => `${v}%`}
								/>
								<YAxis
									type="category"
									dataKey="name"
									tick={{ fill: "#94a3b8", fontSize: 12 }}
									width={100}
								/>
								<Tooltip
									contentStyle={{
										backgroundColor: "#1e293b",
										border: "1px solid #334155",
										borderRadius: "8px",
										color: "#f1f5f9",
									}}
									formatter={(value) => [`${value ?? 0}%`, "Score"]}
								/>
								<Bar dataKey="score" radius={[0, 4, 4, 0]}>
									{barData.map((entry, index) => {
										const optIndex = options.findIndex(
											(o) => o.id === entry.optionId,
										);
										return (
											<Cell
												key={entry.optionId}
												fill={getOptionColor(optIndex >= 0 ? optIndex : index)}
											/>
										);
									})}
								</Bar>
							</BarChart>
						</ResponsiveContainer>
					</div>

					{/* Rank change alert */}
					<RankChangeAlert rankChanges={rankChanges} />
				</div>
			</div>

			{/* Footer */}
			<footer className="px-8 py-4 border-t border-slate-800 flex items-center justify-between shrink-0">
				<button
					onClick={() => setActiveView("canvas")}
					className="px-4 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
				>
					← Back to Canvas
				</button>
				<button
					onClick={handleSaveBaseline}
					disabled={!hasChanges}
					className="px-5 py-2 rounded-xl text-sm font-semibold bg-accent-400 text-slate-950 hover:bg-accent-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
				>
					{saved ? "Saved!" : "Save as New Baseline"}
				</button>
			</footer>
		</div>
	);
}

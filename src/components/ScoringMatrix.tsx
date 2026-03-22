import { useMemo, useState } from "react";
import { rankOptions } from "../lib/scoring";
import { useDecisionStore } from "../store/decision-store";
import type { Criterion, Option } from "../types";
import { InlineEdit } from "./InlineEdit";
import { RankBadge } from "./RankBadge";
import { ScoreCell } from "./ScoreCell";

type ScoringMatrixProps = {
	readOnly?: boolean;
	data?: {
		options: Option[];
		criteria: Criterion[];
		scores: Record<number, Record<number, number>>;
	};
};

export function ScoringMatrix({
	readOnly = false,
	data,
}: ScoringMatrixProps = {}) {
	const storeData = useDecisionStore();

	const options = data?.options ?? storeData.options;
	const criteria = data?.criteria ?? storeData.criteria;
	const scores = data?.scores ?? storeData.scores;
	const editable = !readOnly && !data;

	const [addingOption, setAddingOption] = useState(false);
	const [newOptionName, setNewOptionName] = useState("");
	const [addingCriterion, setAddingCriterion] = useState(false);
	const [newCriterionName, setNewCriterionName] = useState("");

	const ranked = useMemo(
		() => rankOptions(options, scores, criteria),
		[options, scores, criteria],
	);

	const rankMap = useMemo(() => {
		const m: Record<number, number> = {};
		for (const r of ranked) {
			m[r.optionId] = r.rank;
		}
		return m;
	}, [ranked]);

	const totalMap = useMemo(() => {
		const m: Record<number, number> = {};
		for (const r of ranked) {
			m[r.optionId] = r.weightedTotal;
		}
		return m;
	}, [ranked]);

	const normalizedMap = useMemo(() => {
		const m: Record<number, number> = {};
		for (const r of ranked) {
			m[r.optionId] = r.normalizedScore;
		}
		return m;
	}, [ranked]);

	async function handleAddOption() {
		const name = newOptionName.trim();
		if (!name) return;
		await storeData.addOption(name);
		setNewOptionName("");
		// keep form open for rapid entry
	}

	async function handleAddCriterion() {
		const name = newCriterionName.trim();
		if (!name) return;
		await storeData.addCriterion(name);
		setNewCriterionName("");
		// keep form open for rapid entry
	}

	function handleDeleteOption(id: number, name: string) {
		if (window.confirm(`Delete option "${name}"? This cannot be undone.`)) {
			storeData.removeOption(id).catch((err: unknown) => {
				console.error("Failed to delete option:", err);
			});
		}
	}

	function handleDeleteCriterion(id: number, name: string) {
		if (
			window.confirm(
				`Delete criterion "${name}"? All scores for this criterion will be lost.`,
			)
		) {
			storeData.removeCriterion(id).catch((err: unknown) => {
				console.error("Failed to delete criterion:", err);
			});
		}
	}

	// Empty state
	if (options.length === 0 && criteria.length === 0) {
		if (!editable) {
			return (
				<p className="text-sm text-slate-500 py-8 text-center">
					No data recorded.
				</p>
			);
		}

		return (
			<div className="flex flex-col items-center justify-center py-24">
				<p className="text-xl font-bold text-slate-300 mt-6">
					Start building your matrix
				</p>
				<p className="text-slate-500 mt-2">
					Add options and criteria to begin scoring.
				</p>
				<div className="flex gap-4 mt-8">
					<button
						type="button"
						onClick={() => setAddingOption(true)}
						className="px-4 py-2 rounded-lg bg-accent-500 text-white font-semibold text-sm hover:bg-accent-400 transition-colors duration-150"
					>
						Add first option
					</button>
					<button
						type="button"
						onClick={() => setAddingCriterion(true)}
						className="px-4 py-2 rounded-lg border border-slate-600 text-slate-300 font-semibold text-sm hover:border-accent-400 hover:text-accent-300 transition-colors duration-150"
					>
						Add first criterion
					</button>
				</div>
				{/* Inline forms for empty-state entry */}
				{addingOption && (
					<div className="flex items-center gap-2 mt-6">
						<input
							autoFocus
							type="text"
							placeholder="Option name"
							value={newOptionName}
							onChange={(e) => setNewOptionName(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === "Enter") {
									handleAddOption().catch((err: unknown) => console.error(err));
								} else if (e.key === "Escape") {
									setAddingOption(false);
									setNewOptionName("");
								}
							}}
							className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-slate-100 outline-none focus:border-accent-400 min-w-48"
						/>
						<button
							type="button"
							onClick={() =>
								handleAddOption().catch((err: unknown) => console.error(err))
							}
							className="px-3 py-1.5 rounded-lg bg-accent-500 text-white text-sm font-semibold hover:bg-accent-400 transition-colors"
						>
							Add
						</button>
						<button
							type="button"
							onClick={() => {
								setAddingOption(false);
								setNewOptionName("");
							}}
							className="px-3 py-1.5 rounded-lg border border-slate-600 text-slate-400 text-sm hover:text-slate-200 transition-colors"
						>
							Cancel
						</button>
					</div>
				)}
				{addingCriterion && (
					<div className="flex items-center gap-2 mt-6">
						<input
							autoFocus
							type="text"
							placeholder="Criterion name"
							value={newCriterionName}
							onChange={(e) => setNewCriterionName(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === "Enter") {
									handleAddCriterion().catch((err: unknown) =>
										console.error(err),
									);
								} else if (e.key === "Escape") {
									setAddingCriterion(false);
									setNewCriterionName("");
								}
							}}
							className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-slate-100 outline-none focus:border-accent-400 min-w-48"
						/>
						<button
							type="button"
							onClick={() =>
								handleAddCriterion().catch((err: unknown) => console.error(err))
							}
							className="px-3 py-1.5 rounded-lg bg-accent-500 text-white text-sm font-semibold hover:bg-accent-400 transition-colors"
						>
							Add
						</button>
						<button
							type="button"
							onClick={() => {
								setAddingCriterion(false);
								setNewCriterionName("");
							}}
							className="px-3 py-1.5 rounded-lg border border-slate-600 text-slate-400 text-sm hover:text-slate-200 transition-colors"
						>
							Cancel
						</button>
					</div>
				)}
			</div>
		);
	}

	function scoreTintClass(score: number): string {
		if (score <= 3) return "bg-red-500/5";
		if (score >= 7) return "bg-teal-500/5";
		return "";
	}

	return (
		<div className="overflow-x-auto">
			<table className="border-collapse text-sm text-slate-200 w-full">
				<thead>
					<tr className="border-b border-slate-700">
						{/* Options label column */}
						<th className="text-left px-4 py-3 font-semibold text-slate-400 whitespace-nowrap w-40">
							Options
						</th>

						{/* Criterion columns */}
						{criteria.map((c) =>
							editable ? (
								<th
									key={c.id}
									className="group px-3 py-3 text-center align-bottom min-w-28"
								>
									<div className="flex flex-col items-center gap-1">
										<div className="flex items-center gap-1 w-full justify-center">
											<InlineEdit
												value={c.name}
												onCommit={(name) =>
													storeData.updateCriterionField(c.id, { name })
												}
												placeholder="Criterion"
												className="text-xs font-semibold text-slate-300 max-w-24"
											/>
											<button
												type="button"
												onClick={() => handleDeleteCriterion(c.id, c.name)}
												className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-500 hover:text-red-400 ml-0.5 flex-shrink-0"
												title="Delete criterion"
											>
												<svg
													xmlns="http://www.w3.org/2000/svg"
													className="w-3 h-3"
													viewBox="0 0 20 20"
													fill="currentColor"
												>
													<path
														fillRule="evenodd"
														d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
														clipRule="evenodd"
													/>
												</svg>
											</button>
										</div>
										{/* Weight input */}
										<div className="flex items-center gap-1 text-xs text-slate-500">
											<span>w:</span>
											<input
												type="text"
												inputMode="numeric"
												defaultValue={c.weight}
												key={`w-${c.id}-${c.weight}`}
												onBlur={(e) => {
													const parsed = parseFloat(e.target.value);
													const clamped = Number.isNaN(parsed)
														? 1
														: Math.max(0, Math.min(10, parsed));
													e.target.value = String(clamped);
													storeData.updateCriterionField(c.id, {
														weight: clamped,
													});
												}}
												onKeyDown={(e) => {
													if (e.key === "Enter") {
														(e.target as HTMLInputElement).blur();
													} else if (e.key === "Escape") {
														(e.target as HTMLInputElement).value = String(
															c.weight,
														);
														(e.target as HTMLInputElement).blur();
													}
												}}
												className="w-10 text-center bg-slate-800 border border-slate-700 rounded px-1 py-0.5 text-xs text-slate-300 outline-none focus:border-accent-400"
											/>
										</div>
									</div>
								</th>
							) : (
								<th
									key={c.id}
									className="px-3 py-3 text-center align-bottom min-w-28"
								>
									<div className="flex flex-col items-center gap-1">
										<span className="text-xs font-semibold text-slate-300">
											{c.name}
										</span>
										<span className="text-xs text-slate-500">
											w: {c.weight}
										</span>
									</div>
								</th>
							),
						)}

						{/* Add criterion button in header — editable only */}
						{editable && (
							<th className="px-3 py-3 text-center align-bottom">
								{addingCriterion ? (
									<div className="flex flex-col items-center gap-1 min-w-32">
										<input
											autoFocus
											type="text"
											placeholder="Name"
											value={newCriterionName}
											onChange={(e) => setNewCriterionName(e.target.value)}
											onKeyDown={(e) => {
												if (e.key === "Enter") {
													handleAddCriterion().catch((err: unknown) =>
														console.error(err),
													);
												} else if (e.key === "Escape") {
													setAddingCriterion(false);
													setNewCriterionName("");
												}
											}}
											className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-xs text-slate-100 outline-none focus:border-accent-400"
										/>
										<div className="flex gap-1">
											<button
												type="button"
												onClick={() =>
													handleAddCriterion().catch((err: unknown) =>
														console.error(err),
													)
												}
												className="px-2 py-0.5 rounded bg-accent-500 text-white text-xs font-semibold hover:bg-accent-400 transition-colors"
											>
												Add
											</button>
											<button
												type="button"
												onClick={() => {
													setAddingCriterion(false);
													setNewCriterionName("");
												}}
												className="px-2 py-0.5 rounded border border-slate-600 text-slate-400 text-xs hover:text-slate-200 transition-colors"
											>
												✕
											</button>
										</div>
									</div>
								) : (
									<button
										type="button"
										onClick={() => setAddingCriterion(true)}
										className="text-slate-500 hover:text-accent-400 transition-colors font-mono text-lg leading-none"
										title="Add criterion"
									>
										+
									</button>
								)}
							</th>
						)}

						{/* Summary columns */}
						<th className="px-3 py-3 text-center text-slate-400 font-semibold whitespace-nowrap">
							Total
						</th>
						<th className="px-3 py-3 text-center text-slate-400 font-semibold">
							Score
						</th>
						<th className="px-3 py-3 text-center text-slate-400 font-semibold">
							Rank
						</th>
					</tr>
				</thead>

				<tbody>
					{options.map((opt) => (
						<tr
							key={opt.id}
							className="group border-b border-slate-800 hover:bg-slate-800/30 transition-colors"
						>
							{/* Option name */}
							<td className="px-4 py-2">
								{editable ? (
									<div className="flex items-center gap-1 min-w-0">
										<InlineEdit
											value={opt.name}
											onCommit={(name) =>
												storeData.updateOptionField(opt.id, { name })
											}
											placeholder="Option"
											className="text-sm font-medium text-slate-200 truncate"
										/>
										<button
											type="button"
											onClick={() => handleDeleteOption(opt.id, opt.name)}
											className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-500 hover:text-red-400 flex-shrink-0"
											title="Delete option"
										>
											<svg
												xmlns="http://www.w3.org/2000/svg"
												className="w-3.5 h-3.5"
												viewBox="0 0 20 20"
												fill="currentColor"
											>
												<path
													fillRule="evenodd"
													d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
													clipRule="evenodd"
												/>
											</svg>
										</button>
									</div>
								) : (
									<span className="text-sm font-medium text-slate-200">
										{opt.name}
									</span>
								)}
							</td>

							{/* Score cells */}
							{criteria.map((c) => (
								<td key={c.id} className="px-3 py-2 text-center">
									{editable ? (
										<ScoreCell
											value={scores[opt.id]?.[c.id] ?? 0}
											onChange={(score) =>
												storeData.setScore(opt.id, c.id, score)
											}
										/>
									) : (
										(() => {
											const score = scores[opt.id]?.[c.id] ?? 0;
											return (
												<span
													className={`font-mono text-sm inline-flex items-center justify-center w-12 h-9 rounded-md ${scoreTintClass(score)}`}
												>
													{score}
												</span>
											);
										})()
									)}
								</td>
							))}

							{/* Empty cell under the + criterion button — editable only */}
							{editable && <td />}

							{/* Summary cells */}
							<td className="px-3 py-2 text-center font-mono text-slate-300 text-sm">
								{totalMap[opt.id]?.toFixed(1) ?? "0.0"}
							</td>
							<td className="px-3 py-2 text-center font-mono text-slate-300 text-sm">
								{normalizedMap[opt.id] != null
									? `${normalizedMap[opt.id].toFixed(0)}%`
									: "0%"}
							</td>
							<td className="px-3 py-2 text-center">
								{rankMap[opt.id] != null ? (
									<RankBadge rank={rankMap[opt.id]} />
								) : null}
							</td>
						</tr>
					))}

					{/* Add option row — editable only */}
					{editable && (
						<tr className="border-b border-slate-800">
							<td colSpan={criteria.length + 5} className="px-4 py-2">
								{addingOption ? (
									<div className="flex items-center gap-2">
										<input
											autoFocus
											type="text"
											placeholder="Option name"
											value={newOptionName}
											onChange={(e) => setNewOptionName(e.target.value)}
											onKeyDown={(e) => {
												if (e.key === "Enter") {
													handleAddOption().catch((err: unknown) =>
														console.error(err),
													);
												} else if (e.key === "Escape") {
													setAddingOption(false);
													setNewOptionName("");
												}
											}}
											className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-slate-100 outline-none focus:border-accent-400 min-w-48"
										/>
										<button
											type="button"
											onClick={() =>
												handleAddOption().catch((err: unknown) =>
													console.error(err),
												)
											}
											className="px-3 py-1.5 rounded-lg bg-accent-500 text-white text-sm font-semibold hover:bg-accent-400 transition-colors"
										>
											Add
										</button>
										<button
											type="button"
											onClick={() => {
												setAddingOption(false);
												setNewOptionName("");
											}}
											className="px-3 py-1.5 rounded-lg border border-slate-600 text-slate-400 text-sm hover:text-slate-200 transition-colors"
										>
											Cancel
										</button>
									</div>
								) : (
									<button
										type="button"
										onClick={() => setAddingOption(true)}
										className="text-slate-500 hover:text-accent-400 transition-colors text-sm flex items-center gap-1"
									>
										<span className="font-mono text-base leading-none">+</span>
										<span>Add option</span>
									</button>
								)}
							</td>
						</tr>
					)}
				</tbody>
			</table>
		</div>
	);
}

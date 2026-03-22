import { useEffect, useState } from "react";
import { getCriteria, getDecisions, getOptions, getScores } from "../lib/db";
import { useAppStore } from "../store/app-store";
import type { Criterion, Decision, Option } from "../types";
import { EmptyState } from "./EmptyState";
import { ScoringMatrix } from "./ScoringMatrix";

type LoadedData = {
	options: Option[];
	criteria: Criterion[];
	scores: Record<number, Record<number, number>>;
};

export function DecisionHistoryView() {
	const [archivedDecisions, setArchivedDecisions] = useState<Decision[]>([]);
	const [expandedId, setExpandedId] = useState<number | null>(null);
	const [loadedData, setLoadedData] = useState<Record<number, LoadedData>>({});
	const [loadingId, setLoadingId] = useState<number | null>(null);

	const setActiveView = useAppStore((s) => s.setActiveView);

	useEffect(() => {
		getDecisions()
			.then((all) =>
				setArchivedDecisions(all.filter((d) => d.status === "archived")),
			)
			.catch((err: unknown) => console.error("Failed to load history:", err));
	}, []);

	async function toggleExpand(id: number) {
		if (expandedId === id) {
			setExpandedId(null);
			return;
		}
		setExpandedId(id);

		// If data already cached, don't re-fetch
		if (loadedData[id]) return;

		setLoadingId(id);
		try {
			const [options, criteria, scores] = await Promise.all([
				getOptions(id),
				getCriteria(id),
				getScores(id),
			]);
			setLoadedData((prev) => ({
				...prev,
				[id]: { options, criteria, scores },
			}));
		} catch (err) {
			console.error("Failed to load decision data:", err);
		} finally {
			setLoadingId(null);
		}
	}

	return (
		<div className="flex flex-col h-full">
			<header className="px-8 pt-6 pb-4 shrink-0 border-b border-slate-800">
				<h2 className="text-2xl font-bold tracking-tight">Decision History</h2>
				<p className="text-sm text-slate-400 mt-1">
					Browse past decisions and their outcomes
				</p>
			</header>

			<div className="flex-1 overflow-auto px-8 py-6">
				{archivedDecisions.length === 0 ? (
					<EmptyState
						icon={
							<svg
								xmlns="http://www.w3.org/2000/svg"
								className="w-12 h-12"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
								strokeWidth={1.5}
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
								/>
							</svg>
						}
						title="No archived decisions yet"
						description="Archive a decision from the canvas to see it here."
						action={{
							label: "Go to Canvas",
							onClick: () => setActiveView("canvas"),
						}}
					/>
				) : (
					<div className="space-y-3">
						{archivedDecisions.map((d) => (
							<div
								key={d.id}
								className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden"
							>
								{/* Clickable header */}
								<button
									type="button"
									onClick={() => {
										toggleExpand(d.id).catch((err: unknown) =>
											console.error("Failed to toggle expand:", err),
										);
									}}
									className="w-full text-left px-5 py-4 flex items-center justify-between hover:bg-slate-800/50 transition-colors duration-150"
								>
									<div className="min-w-0">
										<h3 className="text-base font-bold text-slate-100">
											{d.name}
										</h3>
										<div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
											<span>
												Archived{" "}
												{d.archivedAt
													? new Date(d.archivedAt).toLocaleDateString()
													: ""}
											</span>
											{d.outcome && (
												<span className="text-slate-400">· {d.outcome}</span>
											)}
										</div>
										{d.outcomeNotes && expandedId !== d.id && (
											<p className="text-sm text-slate-500 mt-1 truncate max-w-lg">
												{d.outcomeNotes}
											</p>
										)}
									</div>

									{/* Chevron */}
									<svg
										className={`w-5 h-5 text-slate-500 transition-transform duration-200 shrink-0 ${
											expandedId === d.id ? "rotate-180" : ""
										}`}
										viewBox="0 0 20 20"
										fill="currentColor"
									>
										<path
											fillRule="evenodd"
											d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
											clipRule="evenodd"
										/>
									</svg>
								</button>

								{/* Expanded content */}
								{expandedId === d.id && (
									<div className="border-t border-slate-800 px-5 py-4">
										{d.outcomeNotes && (
											<div className="mb-4">
												<h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
													Notes
												</h4>
												<p className="text-sm text-slate-300 whitespace-pre-wrap">
													{d.outcomeNotes}
												</p>
											</div>
										)}

										{loadingId === d.id ? (
											<div className="py-8 animate-pulse space-y-2">
												<div className="h-4 w-48 bg-slate-800 rounded" />
												<div className="h-32 bg-slate-800/50 rounded-xl" />
											</div>
										) : loadedData[d.id] ? (
											<div>
												<h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
													Scoring Matrix
												</h4>
												<ScoringMatrix readOnly data={loadedData[d.id]} />
											</div>
										) : null}
									</div>
								)}
							</div>
						))}
					</div>
				)}
			</div>
		</div>
	);
}

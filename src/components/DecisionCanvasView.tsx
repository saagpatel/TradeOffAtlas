import { useState } from "react";
import { archiveDecision } from "../lib/db";
import { useAppStore } from "../store/app-store";
import { useDecisionStore } from "../store/decision-store";
import { useSensitivityStore } from "../store/sensitivity-store";
import { EmptyState } from "./EmptyState";
import { InlineEdit } from "./InlineEdit";
import { NewDecisionModal } from "./NewDecisionModal";
import { ScoringMatrix } from "./ScoringMatrix";

export function DecisionCanvasView() {
	const [showNewDecisionModal, setShowNewDecisionModal] = useState(false);

	const decisions = useDecisionStore((s) => s.decisions);
	const activeDecisionId = useDecisionStore((s) => s.activeDecisionId);
	const loading = useDecisionStore((s) => s.loading);
	const updateDecisionField = useDecisionStore((s) => s.updateDecisionField);
	const criteria = useDecisionStore((s) => s.criteria);
	const options = useDecisionStore((s) => s.options);

	const setActiveView = useAppStore((s) => s.setActiveView);

	const activeDecision = decisions.find((d) => d.id === activeDecisionId);

	async function handleArchive() {
		if (!activeDecisionId) return;
		const confirmed = window.confirm(
			`Archive "${activeDecision?.name}"? This will move it to the decision history.`,
		);
		if (!confirmed) return;
		await archiveDecision(activeDecisionId, {
			outcome: "Archived without outcome",
		});
		const store = useDecisionStore.getState();
		await store.loadDecisions();
		await store.setActiveDecision(null);
	}

	if (loading) {
		return (
			<div className="flex flex-col h-full px-8 py-8 gap-4 animate-pulse">
				<div className="h-9 w-64 bg-slate-800 rounded-xl" />
				<div className="h-5 w-96 bg-slate-800 rounded-lg" />
				<div className="flex-1 mt-6 bg-slate-800/40 rounded-2xl" />
			</div>
		);
	}

	if (!activeDecision && decisions.length === 0) {
		return (
			<>
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
								<path d="M12 3v1m0 16v1M4.22 4.22l.71.71m13.66 13.66.71.71M3 12H2m20 0h-1M4.22 19.78l.71-.71M18.36 5.64l.71-.71" />
								<circle cx="12" cy="12" r="4" />
							</svg>
						}
						title="No decisions yet"
						description="Create your first decision to start weighing your options."
						action={{
							label: "New Decision",
							onClick: () => setShowNewDecisionModal(true),
						}}
					/>
				</div>
				<NewDecisionModal
					open={showNewDecisionModal}
					onClose={() => setShowNewDecisionModal(false)}
				/>
			</>
		);
	}

	if (!activeDecision) {
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
							<path d="M9 18l6-6-6-6" />
						</svg>
					}
					title="Select a decision"
					description="Pick a decision from the sidebar to start scoring."
				/>
			</div>
		);
	}

	return (
		<div className="flex flex-col h-full">
			<header className="px-8 pt-8 pb-2 shrink-0">
				<InlineEdit
					value={activeDecision.name}
					onCommit={(name) => updateDecisionField({ name })}
					className="text-3xl font-bold tracking-tight text-slate-100"
					placeholder="Decision name..."
				/>
				<InlineEdit
					value={activeDecision.description}
					onCommit={(description) => updateDecisionField({ description })}
					className="text-base font-light text-slate-400 mt-2"
					placeholder="Add a description..."
				/>
			</header>

			<div className="flex-1 overflow-auto px-8 py-6">
				<ScoringMatrix />
			</div>

			<footer className="px-8 py-4 border-t border-slate-800 flex items-center gap-4 shrink-0">
				<button
					onClick={() => {
						useSensitivityStore.getState().loadFromDecision(
							criteria,
							options.map((o) => o.id),
						);
						setActiveView("sensitivity");
					}}
					disabled={criteria.length === 0 || options.length === 0}
					className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-150 ${
						criteria.length === 0 || options.length === 0
							? "text-slate-500 bg-slate-800 cursor-not-allowed"
							: "text-accent-300 bg-accent-500/10 hover:bg-accent-500/20"
					}`}
				>
					Run Sensitivity Analysis
				</button>
				<button
					onClick={() => void handleArchive()}
					className="px-4 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-red-400 hover:bg-red-400/10 transition-colors duration-150"
				>
					Archive Decision
				</button>
			</footer>
		</div>
	);
}

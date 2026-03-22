import { useEffect, useState } from "react";
import { deleteTemplate, getTemplates } from "../lib/db";
import { useAppStore } from "../store/app-store";
import type { Template } from "../types";
import { EmptyState } from "./EmptyState";
import { NewDecisionModal } from "./NewDecisionModal";

export function TemplateLibraryView() {
	const [templates, setTemplates] = useState<Template[]>([]);
	const [loading, setLoading] = useState(true);
	const [newDecisionOpen, setNewDecisionOpen] = useState(false);
	const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(
		null,
	);

	const setActiveView = useAppStore((s) => s.setActiveView);

	useEffect(() => {
		getTemplates()
			.then(setTemplates)
			.catch((err: unknown) => console.error("Failed to load templates:", err))
			.finally(() => setLoading(false));
	}, []);

	function handleDelete(id: number, name: string) {
		if (window.confirm(`Delete template "${name}"? This cannot be undone.`)) {
			deleteTemplate(id)
				.then(() => setTemplates((prev) => prev.filter((t) => t.id !== id)))
				.catch((err: unknown) =>
					console.error("Failed to delete template:", err),
				);
		}
	}

	function handleCloseNewDecision() {
		setNewDecisionOpen(false);
		setSelectedTemplateId(null);
		getTemplates()
			.then(setTemplates)
			.catch((err: unknown) =>
				console.error("Failed to refresh templates:", err),
			);
	}

	return (
		<div className="flex flex-col h-full">
			<header className="px-8 pt-6 pb-4 shrink-0 border-b border-slate-800">
				<h2 className="text-2xl font-bold tracking-tight">Template Library</h2>
				<p className="text-sm text-slate-400 mt-1">
					Save and reuse criteria sets across decisions
				</p>
			</header>

			<div className="flex-1 overflow-auto px-8 py-6">
				{loading ? (
					<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
						{[...Array(4)].map((_, i) => (
							<div
								key={i}
								className="bg-slate-900 border border-slate-800 rounded-xl p-5 h-36 animate-pulse"
							/>
						))}
					</div>
				) : templates.length === 0 ? (
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
									d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
								/>
							</svg>
						}
						title="No templates yet"
						description="Save your first one from any decision canvas."
						action={{
							label: "Go to Canvas",
							onClick: () => setActiveView("canvas"),
						}}
					/>
				) : (
					<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
						{templates.map((t) => (
							<div
								key={t.id}
								className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col"
							>
								<div className="flex items-start justify-between gap-3">
									<div className="min-w-0">
										<h3 className="text-base font-bold text-slate-100 truncate">
											{t.name}
										</h3>
										{t.category && (
											<span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-accent-500/10 text-accent-300">
												{t.category}
											</span>
										)}
									</div>
									<button
										type="button"
										onClick={() => handleDelete(t.id, t.name)}
										className="text-slate-600 hover:text-red-400 shrink-0 transition-colors duration-150"
										title="Delete template"
									>
										<svg
											xmlns="http://www.w3.org/2000/svg"
											className="w-4 h-4"
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

								{t.description && (
									<p className="text-sm text-slate-400 mt-2 line-clamp-2">
										{t.description}
									</p>
								)}

								<div className="mt-auto pt-4 flex items-center justify-between">
									<span className="text-xs text-slate-500">
										Used {t.useCount} time{t.useCount !== 1 ? "s" : ""} ·{" "}
										{new Date(t.createdAt).toLocaleDateString()}
									</span>
									<button
										type="button"
										onClick={() => {
											setSelectedTemplateId(t.id);
											setNewDecisionOpen(true);
										}}
										className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-accent-400 text-slate-950 hover:bg-accent-500 transition-colors duration-150"
									>
										Apply to New Decision
									</button>
								</div>
							</div>
						))}
					</div>
				)}
			</div>

			<NewDecisionModal
				open={newDecisionOpen}
				onClose={handleCloseNewDecision}
				defaultTemplateId={selectedTemplateId}
			/>
		</div>
	);
}

import { useEffect, useState } from "react";
import { archiveDecision } from "../lib/db";
import { useDecisionStore } from "../store/decision-store";
import { Modal } from "./Modal";

type ArchiveDecisionModalProps = {
	open: boolean;
	onClose: () => void;
};

export function ArchiveDecisionModal({
	open,
	onClose,
}: ArchiveDecisionModalProps) {
	const activeDecisionId = useDecisionStore((s) => s.activeDecisionId);
	const decisions = useDecisionStore((s) => s.decisions);
	const options = useDecisionStore((s) => s.options);

	const activeDecision = decisions.find((d) => d.id === activeDecisionId);

	const [winningOptionId, setWinningOptionId] = useState<number | "">("");
	const [outcome, setOutcome] = useState("");
	const [notes, setNotes] = useState("");
	const [submitting, setSubmitting] = useState(false);

	useEffect(() => {
		if (open) {
			const firstOption = options[0];
			if (firstOption) {
				setWinningOptionId(firstOption.id);
				setOutcome(`Chose ${firstOption.name}`);
			} else {
				setWinningOptionId("");
				setOutcome("");
			}
			setNotes("");
			setSubmitting(false);
		}
	}, [open, options]);

	function handleWinningOptionChange(e: React.ChangeEvent<HTMLSelectElement>) {
		const id = e.target.value ? Number(e.target.value) : "";
		setWinningOptionId(id);
		if (id !== "") {
			const opt = options.find((o) => o.id === id);
			if (opt) {
				setOutcome(`Chose ${opt.name}`);
			}
		}
	}

	function handleClose() {
		setWinningOptionId("");
		setOutcome("");
		setNotes("");
		setSubmitting(false);
		onClose();
	}

	async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		if (!activeDecisionId || submitting) return;
		setSubmitting(true);
		try {
			await archiveDecision(activeDecisionId, {
				outcome: outcome.trim(),
				outcomeNotes: notes.trim(),
			});
			const store = useDecisionStore.getState();
			await store.loadDecisions();
			await store.setActiveDecision(null);
			handleClose();
		} catch (err) {
			console.error("Failed to archive:", err);
			setSubmitting(false);
		}
	}

	const inputClass =
		"bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 w-full text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-600 transition-colors duration-150";

	return (
		<Modal open={open} onClose={handleClose} title="Archive Decision">
			<div className="mb-4">
				<p className="text-sm text-slate-400">
					Archiving{" "}
					<span className="text-slate-200 font-medium">
						{activeDecision?.name ?? "this decision"}
					</span>{" "}
					will move it to the decision history.
				</p>
			</div>

			<form onSubmit={handleSubmit} className="flex flex-col gap-4">
				{options.length > 0 && (
					<div>
						<label
							htmlFor="winning-option"
							className="block text-sm font-medium text-slate-400 mb-1.5"
						>
							Winning option
						</label>
						<select
							id="winning-option"
							value={winningOptionId}
							onChange={handleWinningOptionChange}
							className={`${inputClass} cursor-pointer`}
						>
							{options.map((o) => (
								<option key={o.id} value={o.id}>
									{o.name}
								</option>
							))}
						</select>
					</div>
				)}

				<div>
					<label
						htmlFor="archive-outcome"
						className="block text-sm font-medium text-slate-400 mb-1.5"
					>
						Outcome <span className="text-red-400">*</span>
					</label>
					<input
						id="archive-outcome"
						type="text"
						value={outcome}
						onChange={(e) => setOutcome(e.target.value)}
						placeholder="e.g. Chose Option A"
						className={inputClass}
						required
					/>
				</div>

				<div>
					<label
						htmlFor="archive-notes"
						className="block text-sm font-medium text-slate-400 mb-1.5"
					>
						Notes
					</label>
					<textarea
						id="archive-notes"
						value={notes}
						onChange={(e) => setNotes(e.target.value)}
						placeholder="Any additional context or reflections..."
						className={`${inputClass} resize-none`}
						rows={3}
					/>
				</div>

				<div className="flex items-center justify-end gap-3 mt-2">
					<button
						type="button"
						onClick={handleClose}
						className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 transition-colors duration-150"
					>
						Cancel
					</button>
					<button
						type="submit"
						disabled={!outcome.trim() || submitting}
						className="px-5 py-2.5 bg-red-500 text-white font-semibold text-sm rounded-xl hover:bg-red-600 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
					>
						{submitting ? "Archiving..." : "Archive Decision"}
					</button>
				</div>
			</form>
		</Modal>
	);
}

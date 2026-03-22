import { useEffect, useState } from "react";
import { getTemplates } from "../lib/db";
import { useDecisionStore } from "../store/decision-store";
import type { Template } from "../types";
import { Modal } from "./Modal";

type NewDecisionModalProps = {
	open: boolean;
	onClose: () => void;
};

export function NewDecisionModal({ open, onClose }: NewDecisionModalProps) {
	const [name, setName] = useState("");
	const [description, setDescription] = useState("");
	const [templateId, setTemplateId] = useState<number | null>(null);
	const [templates, setTemplates] = useState<Template[]>([]);
	const [submitting, setSubmitting] = useState(false);

	useEffect(() => {
		if (open) {
			getTemplates()
				.then(setTemplates)
				.catch((err: unknown) => {
					console.error("Failed to load templates:", err);
				});
		}
	}, [open]);

	function handleClose() {
		setName("");
		setDescription("");
		setTemplateId(null);
		setSubmitting(false);
		onClose();
	}

	async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		if (!name.trim() || submitting) return;

		setSubmitting(true);
		try {
			await useDecisionStore.getState().createAndActivateDecision({
				name: name.trim(),
				description: description.trim(),
				templateId,
			});
			handleClose();
		} catch (err) {
			console.error("Failed to create decision:", err);
			setSubmitting(false);
		}
	}

	const inputClass =
		"bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 w-full text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-600 transition-colors duration-150";

	return (
		<Modal open={open} onClose={handleClose} title="New Decision">
			<form onSubmit={handleSubmit} className="flex flex-col gap-4">
				<div>
					<label
						htmlFor="decision-name"
						className="block text-sm font-medium text-slate-400 mb-1.5"
					>
						Name <span className="text-red-400">*</span>
					</label>
					<input
						id="decision-name"
						type="text"
						value={name}
						onChange={(e) => setName(e.target.value)}
						placeholder="e.g. Which job offer to accept"
						className={inputClass}
						autoFocus
						required
					/>
				</div>

				<div>
					<label
						htmlFor="decision-description"
						className="block text-sm font-medium text-slate-400 mb-1.5"
					>
						Description
					</label>
					<textarea
						id="decision-description"
						value={description}
						onChange={(e) => setDescription(e.target.value)}
						placeholder="Add context or constraints..."
						className={`${inputClass} resize-none`}
						rows={3}
					/>
				</div>

				{templates.length > 0 && (
					<div>
						<label
							htmlFor="decision-template"
							className="block text-sm font-medium text-slate-400 mb-1.5"
						>
							Template
						</label>
						<select
							id="decision-template"
							value={templateId ?? ""}
							onChange={(e) =>
								setTemplateId(e.target.value ? Number(e.target.value) : null)
							}
							className={`${inputClass} cursor-pointer`}
						>
							<option value="">No template</option>
							{templates.map((t) => (
								<option key={t.id} value={t.id}>
									{t.name}
								</option>
							))}
						</select>
					</div>
				)}

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
						disabled={!name.trim() || submitting}
						className="px-5 py-2.5 bg-accent-400 text-slate-950 font-semibold text-sm rounded-xl hover:bg-accent-500 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
					>
						{submitting ? "Creating..." : "Create Decision"}
					</button>
				</div>
			</form>
		</Modal>
	);
}

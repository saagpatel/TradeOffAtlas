import { useState } from "react";
import { createTemplate, createTemplateCriteria } from "../lib/db";
import { useDecisionStore } from "../store/decision-store";
import { Modal } from "./Modal";

type SaveTemplateModalProps = {
	open: boolean;
	onClose: () => void;
};

export function SaveTemplateModal({ open, onClose }: SaveTemplateModalProps) {
	const criteria = useDecisionStore((s) => s.criteria);

	const [name, setName] = useState("");
	const [category, setCategory] = useState("");
	const [description, setDescription] = useState("");
	const [submitting, setSubmitting] = useState(false);

	function handleClose() {
		setName("");
		setCategory("");
		setDescription("");
		setSubmitting(false);
		onClose();
	}

	async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		if (!name.trim() || criteria.length === 0 || submitting) return;
		setSubmitting(true);
		try {
			const template = await createTemplate({
				name: name.trim(),
				description: description.trim(),
				category: category.trim(),
			});
			await createTemplateCriteria(
				template.id,
				criteria.map((c) => ({
					name: c.name,
					weight: c.weight,
					description: c.description,
					position: c.position,
				})),
			);
			handleClose();
		} catch (err) {
			console.error("Failed to save template:", err);
			setSubmitting(false);
		}
	}

	const inputClass =
		"bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 w-full text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-600 transition-colors duration-150";

	return (
		<Modal open={open} onClose={handleClose} title="Save as Template">
			<form onSubmit={handleSubmit} className="flex flex-col gap-4">
				<div>
					<label
						htmlFor="template-name"
						className="block text-sm font-medium text-slate-400 mb-1.5"
					>
						Name <span className="text-red-400">*</span>
					</label>
					<input
						id="template-name"
						type="text"
						value={name}
						onChange={(e) => setName(e.target.value)}
						placeholder="e.g. Job Offer Evaluation"
						className={inputClass}
						autoFocus
						required
					/>
				</div>

				<div>
					<label
						htmlFor="template-category"
						className="block text-sm font-medium text-slate-400 mb-1.5"
					>
						Category
					</label>
					<input
						id="template-category"
						type="text"
						value={category}
						onChange={(e) => setCategory(e.target.value)}
						placeholder="e.g. career, vendor, project"
						className={inputClass}
					/>
				</div>

				<div>
					<label
						htmlFor="template-description"
						className="block text-sm font-medium text-slate-400 mb-1.5"
					>
						Description
					</label>
					<textarea
						id="template-description"
						value={description}
						onChange={(e) => setDescription(e.target.value)}
						placeholder="What kind of decisions is this template for?"
						className={`${inputClass} resize-none`}
						rows={2}
					/>
				</div>

				{criteria.length > 0 && (
					<div>
						<p className="text-sm font-medium text-slate-400 mb-1.5">
							Criteria to save ({criteria.length})
						</p>
						<div className="bg-slate-800/50 rounded-lg p-3 flex flex-col gap-1.5">
							{criteria.map((c) => (
								<div key={c.id} className="flex items-center justify-between">
									<span className="text-xs text-slate-300">{c.name}</span>
									<span className="text-xs text-slate-500">
										weight {c.weight.toFixed(1)}
									</span>
								</div>
							))}
						</div>
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
						disabled={!name.trim() || criteria.length === 0 || submitting}
						className="px-5 py-2.5 bg-accent-400 text-slate-950 font-semibold text-sm rounded-xl hover:bg-accent-500 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
					>
						{submitting ? "Saving..." : "Save Template"}
					</button>
				</div>
			</form>
		</Modal>
	);
}

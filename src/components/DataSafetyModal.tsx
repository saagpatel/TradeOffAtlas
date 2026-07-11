import { confirm, open, save } from "@tauri-apps/plugin-dialog";
import { useState } from "react";
import {
	createPortableBackup,
	defaultBackupFilename,
	restorePortableBackup,
	userMessageForDurabilityError,
} from "../lib/durability";
import { Modal } from "./Modal";

type DataSafetyModalProps = {
	open: boolean;
	onClose: () => void;
	onRestored: () => Promise<void>;
};

type Status =
	| { kind: "idle" }
	| { kind: "working"; message: string }
	| { kind: "success"; message: string }
	| { kind: "error"; message: string };

const BACKUP_FILTER = {
	name: "Tradeoff Atlas database",
	extensions: ["sqlite3", "db"],
};

export function DataSafetyModal({
	open: modalOpen,
	onClose,
	onRestored,
}: DataSafetyModalProps) {
	const [status, setStatus] = useState<Status>({ kind: "idle" });
	const busy = status.kind === "working";

	function handleClose() {
		if (busy) return;
		setStatus({ kind: "idle" });
		onClose();
	}

	async function handleBackup() {
		const destination = await save({
			defaultPath: defaultBackupFilename(),
			filters: [BACKUP_FILTER],
		});
		if (!destination) return;

		setStatus({ kind: "working", message: "Creating a consistent backup…" });
		try {
			const result = await createPortableBackup(destination);
			setStatus({
				kind: "success",
				message: `Backup created and verified at ${result.path}`,
			});
		} catch (error) {
			setStatus({ kind: "error", message: userMessageForDurabilityError(error) });
		}
	}

	async function handleRestore() {
		const source = await open({
			multiple: false,
			directory: false,
			filters: [BACKUP_FILTER],
		});
		if (typeof source !== "string") return;

		const approved = await confirm(
			"Tradeoff Atlas will verify this file, create an automatic backup of your current database, and roll back if the restore cannot finish. Continue?",
			{ title: "Restore Tradeoff Atlas data", kind: "warning" },
		);
		if (!approved) return;

		setStatus({ kind: "working", message: "Validating and restoring data…" });
		try {
			const result = await restorePortableBackup(source);
			await onRestored();
			setStatus({
				kind: "success",
				message: `Restore completed. Your pre-restore backup is at ${result.automaticBackupPath}`,
			});
		} catch (error) {
			setStatus({ kind: "error", message: userMessageForDurabilityError(error) });
		}
	}

	return (
		<Modal open={modalOpen} onClose={handleClose} title="Data Safety">
			<div className="flex flex-col gap-5">
				<p className="text-sm text-slate-400 leading-6">
					Backups include every decision, score, outcome, and template in one
					portable SQLite file. Existing backup files are never overwritten.
				</p>

				<div className="grid grid-cols-2 gap-3">
					<button
						type="button"
						onClick={() => void handleBackup()}
						disabled={busy}
						className="rounded-xl bg-accent-400 px-4 py-3 text-sm font-semibold text-slate-950 transition-colors hover:bg-accent-500 disabled:cursor-not-allowed disabled:opacity-50"
					>
						Create Backup
					</button>
					<button
						type="button"
						onClick={() => void handleRestore()}
						disabled={busy}
						className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm font-semibold text-slate-100 transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
					>
						Restore Backup
					</button>
				</div>

				{status.kind !== "idle" && (
					<div
						role={status.kind === "error" ? "alert" : "status"}
						className={`rounded-xl border px-4 py-3 text-sm leading-5 ${
							status.kind === "error"
								? "border-red-900/70 bg-red-950/40 text-red-300"
								: status.kind === "success"
									? "border-emerald-900/70 bg-emerald-950/40 text-emerald-300"
									: "border-slate-700 bg-slate-800 text-slate-300"
						}`}
					>
						{status.message}
					</div>
				)}
			</div>
		</Modal>
	);
}

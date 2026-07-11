import { invoke } from "@tauri-apps/api/core";
import { closeDatabase, reopenDatabase } from "./db";

export type BackupResult = {
	path: string;
	schemaVersion: number;
	createdAtUnixMs: number;
};

export type RestoreResult = {
	automaticBackupPath: string;
	schemaVersion: number;
};

export type DurabilityFailure = {
	code: string;
	message: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

export function normalizeDurabilityError(error: unknown): DurabilityFailure {
	if (isRecord(error)) {
		const code = typeof error.code === "string" ? error.code : "UNKNOWN_ERROR";
		const message =
			typeof error.message === "string" ? error.message : JSON.stringify(error);
		return { code, message };
	}
	if (typeof error === "string") {
		try {
			return normalizeDurabilityError(JSON.parse(error));
		} catch {
			return { code: "UNKNOWN_ERROR", message: error };
		}
	}
	if (error instanceof Error) {
		return { code: "UNKNOWN_ERROR", message: error.message };
	}
	return { code: "UNKNOWN_ERROR", message: String(error) };
}

export function userMessageForDurabilityError(error: unknown): string {
	const failure = normalizeDurabilityError(error);
	const messages: Record<string, string> = {
		NEWER_SCHEMA_UNSUPPORTED:
			"This backup was created by a newer version of Tradeoff Atlas. Update the app before restoring it.",
		MALFORMED_DATABASE:
			"That file is not a readable Tradeoff Atlas database. Your current data was not changed.",
		INTEGRITY_FAILURE:
			"The selected database failed integrity checks. Your current data was not changed.",
		INCOMPATIBLE_SCHEMA:
			"That database version is not supported by this release. Your current data was not changed.",
		INTERRUPTED_MIGRATION:
			"The selected database contains an incomplete migration and cannot be restored safely.",
		RESTORE_ROLLED_BACK:
			"Restore failed, so Tradeoff Atlas automatically put your original database back.",
		ROLLBACK_FAILED:
			"Restore and automatic rollback both failed. Use the automatic pre-restore backup named in the technical details.",
		PERMISSION_FAILURE:
			"Tradeoff Atlas does not have permission to write that location.",
		IO_FAILURE:
			"The backup or restore could not finish because the destination was unavailable or out of space.",
		DESTINATION_EXISTS:
			"Choose a new filename. Tradeoff Atlas never overwrites an existing backup.",
		PATH_NOT_FOUND: "The selected file or folder is no longer available.",
	};
	return messages[failure.code] ?? failure.message;
}

export function defaultBackupFilename(now = new Date()): string {
	return `tradeoff-atlas-backup-${now.toISOString().slice(0, 10)}.sqlite3`;
}

export async function createPortableBackup(
	destination: string,
): Promise<BackupResult> {
	return invoke<BackupResult>("create_backup", { destination });
}

export async function restorePortableBackup(source: string): Promise<RestoreResult> {
	await closeDatabase();

	let prepared: RestoreResult;
	try {
		prepared = await invoke<RestoreResult>("begin_restore", { source });
	} catch (error) {
		await reopenDatabase();
		throw normalizeDurabilityError(error);
	}

	try {
		await reopenDatabase();
		return await invoke<RestoreResult>("finalize_restore");
	} catch (error) {
		await closeDatabase().catch(() => undefined);
		try {
			await invoke("rollback_restore");
			await reopenDatabase();
		} catch (rollbackError) {
			const failure = normalizeDurabilityError(rollbackError);
			throw {
				code: "ROLLBACK_FAILED",
				message: `${failure.message} Automatic backup: ${prepared.automaticBackupPath}`,
			} satisfies DurabilityFailure;
		}
		const failure = normalizeDurabilityError(error);
		throw {
			code: "RESTORE_ROLLED_BACK",
			message: `${failure.message} Original data restored. Automatic backup: ${prepared.automaticBackupPath}`,
		} satisfies DurabilityFailure;
	}
}

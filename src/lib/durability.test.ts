import { describe, expect, it } from "vitest";
import {
	defaultBackupFilename,
	normalizeDurabilityError,
	userMessageForDurabilityError,
} from "./durability";

describe("durability UI messages", () => {
	it("creates a portable, date-stamped default filename", () => {
		expect(defaultBackupFilename(new Date("2026-07-11T18:00:00Z"))).toBe(
			"tradeoff-atlas-backup-2026-07-11.sqlite3",
		);
	});

	it("preserves structured command errors", () => {
		expect(
			normalizeDurabilityError({
				code: "INTEGRITY_FAILURE",
				message: "foreign key check failed",
			}),
		).toEqual({
			code: "INTEGRITY_FAILURE",
			message: "foreign key check failed",
		});
	});

	it("parses serialized Tauri command errors", () => {
		expect(
			normalizeDurabilityError(
				'{"code":"NEWER_SCHEMA_UNSUPPORTED","message":"version 99"}',
			),
		).toEqual({
			code: "NEWER_SCHEMA_UNSUPPORTED",
			message: "version 99",
		});
	});

	it("shows distinct incompatibility and rollback states", () => {
		expect(
			userMessageForDurabilityError({
				code: "NEWER_SCHEMA_UNSUPPORTED",
				message: "technical detail",
			}),
		).toContain("newer version");
		expect(
			userMessageForDurabilityError({
				code: "RESTORE_ROLLED_BACK",
				message: "technical detail",
			}),
		).toContain("original database back");
	});
});

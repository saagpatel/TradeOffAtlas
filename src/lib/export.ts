import { save } from "@tauri-apps/plugin-dialog";
import { writeFile, writeTextFile } from "@tauri-apps/plugin-fs";
import { jsPDF } from "jspdf";
import { autoTable } from "jspdf-autotable";

import type { Criterion, Option, OptionScore } from "../types";

export type ExportData = {
	decisionName: string;
	decisionDescription: string;
	options: Option[];
	criteria: Criterion[];
	scores: Record<number, Record<number, number>>;
	rankings: OptionScore[];
};

export type ExportFormat = "csv" | "pdf";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function escapeCsv(value: string | number): string {
	const str = String(value);
	if (str.includes(",") || str.includes('"') || str.includes("\n")) {
		return `"${str.replace(/"/g, '""')}"`;
	}
	return str;
}

function toKebabCase(str: string): string {
	return str
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-|-$/g, "");
}

// ---------------------------------------------------------------------------
// CSV generation
// ---------------------------------------------------------------------------

export function generateCsv(data: ExportData): string {
	const { decisionName, decisionDescription, criteria, rankings } = data;
	const rows: string[] = [];

	// Metadata rows
	rows.push(`Decision,${escapeCsv(decisionName)}`);
	rows.push(`Description,${escapeCsv(decisionDescription)}`);
	rows.push(`Exported,${escapeCsv(new Date().toISOString())}`);
	rows.push("");

	// Header row
	const criteriaHeaders = criteria.map(
		(c) => `${escapeCsv(`${c.name} (w:${c.weight.toFixed(1)})`)}`,
	);
	rows.push(["Option", ...criteriaHeaders, "Total", "Score", "Rank"].join(","));

	// Data rows sorted by rank ascending
	const sorted = [...rankings].sort((a, b) => a.rank - b.rank);
	for (const r of sorted) {
		const criteriaValues = criteria.map((c) => escapeCsv(r.scores[c.id] ?? 0));
		rows.push(
			[
				escapeCsv(r.optionName),
				...criteriaValues,
				escapeCsv(r.weightedTotal),
				escapeCsv(r.normalizedScore.toFixed(1) + "%"),
				escapeCsv(r.rank),
			].join(","),
		);
	}

	return rows.join("\n");
}

// ---------------------------------------------------------------------------
// PDF generation
// ---------------------------------------------------------------------------

export async function generatePdf(data: ExportData): Promise<Uint8Array> {
	const { decisionName, decisionDescription, criteria, rankings } = data;

	const doc = new jsPDF();
	let y = 20;

	// Title
	doc.setFontSize(18);
	doc.setTextColor(30, 41, 59); // slate-800 equivalent
	doc.text(decisionName, 14, y);
	y += 10;

	// Description
	if (decisionDescription.trim()) {
		doc.setFontSize(11);
		doc.setTextColor(100, 116, 139); // slate-500
		const descLines = doc.splitTextToSize(decisionDescription, 182);
		doc.text(descLines as string[], 14, y);
		y += (descLines as string[]).length * 6 + 2;
	}

	// Timestamp
	doc.setFontSize(9);
	doc.setTextColor(148, 163, 184); // slate-400
	doc.text(`Exported: ${new Date().toISOString()}`, 14, y);
	y += 10;

	// Scoring matrix table
	const head = [
		[
			"Option",
			...criteria.map((c) => `${c.name}\n(w:${c.weight.toFixed(1)})`),
			"Total",
			"Score",
			"Rank",
		],
	];

	const sorted = [...rankings].sort((a, b) => a.rank - b.rank);
	const body = sorted.map((r) => [
		r.optionName,
		...criteria.map((c) => String(r.scores[c.id] ?? 0)),
		String(r.weightedTotal),
		`${r.normalizedScore.toFixed(1)}%`,
		String(r.rank),
	]);

	autoTable(doc, {
		startY: y,
		head,
		body,
		headStyles: {
			fillColor: [30, 41, 59],
			textColor: [226, 232, 240],
			fontStyle: "bold",
			fontSize: 9,
		},
		bodyStyles: {
			fontSize: 9,
			textColor: [30, 41, 59],
		},
		alternateRowStyles: {
			fillColor: [248, 250, 252],
		},
		styles: {
			cellPadding: 4,
			overflow: "linebreak",
		},
	});

	const arrayBuffer = doc.output("arraybuffer");
	return new Uint8Array(arrayBuffer);
}

// ---------------------------------------------------------------------------
// File save orchestration
// ---------------------------------------------------------------------------

export async function exportToFile(
	data: ExportData,
	format: ExportFormat,
): Promise<boolean> {
	const ext = format === "csv" ? "csv" : "pdf";
	const kebab = toKebabCase(data.decisionName) || "decision";
	const datePart = new Date().toISOString().slice(0, 10);
	const defaultFilename = `${kebab}-${datePart}.${ext}`;

	const filters =
		format === "csv"
			? [{ name: "CSV Files", extensions: ["csv"] }]
			: [{ name: "PDF Files", extensions: ["pdf"] }];

	const path = await save({ defaultPath: defaultFilename, filters });
	if (!path) return false;

	if (format === "csv") {
		const content = generateCsv(data);
		await writeTextFile(path, content);
	} else {
		const bytes = await generatePdf(data);
		await writeFile(path, bytes);
	}

	return true;
}

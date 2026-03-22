import { describe, expect, it } from "vitest";

import type { ExportData } from "./export";
import { generateCsv } from "./export";

function makeExportData(overrides?: Partial<ExportData>): ExportData {
	return {
		decisionName: "Test Decision",
		decisionDescription: "A test",
		options: [
			{
				id: 1,
				decisionId: 1,
				name: "Option A",
				description: "",
				position: 0,
				createdAt: "",
			},
			{
				id: 2,
				decisionId: 1,
				name: "Option B",
				description: "",
				position: 1,
				createdAt: "",
			},
		],
		criteria: [
			{
				id: 1,
				decisionId: 1,
				name: "Cost",
				weight: 5,
				description: "",
				position: 0,
				createdAt: "",
			},
			{
				id: 2,
				decisionId: 1,
				name: "Speed",
				weight: 3,
				description: "",
				position: 1,
				createdAt: "",
			},
		],
		scores: { 1: { 1: 8, 2: 6 }, 2: { 1: 5, 2: 9 } },
		rankings: [
			{
				optionId: 1,
				optionName: "Option A",
				weightedTotal: 58,
				normalizedScore: 72.5,
				rank: 1,
				scores: { 1: 8, 2: 6 },
			},
			{
				optionId: 2,
				optionName: "Option B",
				weightedTotal: 52,
				normalizedScore: 65,
				rank: 2,
				scores: { 1: 5, 2: 9 },
			},
		],
		...overrides,
	};
}

describe("generateCsv", () => {
	it("generates valid CSV with metadata and data rows", () => {
		const csv = generateCsv(makeExportData());
		const lines = csv.split("\n");
		expect(lines[0]).toContain("Test Decision");
		expect(lines[4]).toContain("Option");
		expect(lines[4]).toContain("Cost (w:5.0)");
		expect(lines[5]).toContain("Option A");
		expect(lines[6]).toContain("Option B");
	});

	it("escapes commas in option names", () => {
		const data = makeExportData({
			options: [
				{
					id: 1,
					decisionId: 1,
					name: "Option, with comma",
					description: "",
					position: 0,
					createdAt: "",
				},
			],
			rankings: [
				{
					optionId: 1,
					optionName: "Option, with comma",
					weightedTotal: 58,
					normalizedScore: 72.5,
					rank: 1,
					scores: { 1: 8, 2: 6 },
				},
			],
			scores: { 1: { 1: 8, 2: 6 } },
		});
		const csv = generateCsv(data);
		expect(csv).toContain('"Option, with comma"');
	});

	it("sorts rows by rank", () => {
		const csv = generateCsv(makeExportData());
		const lines = csv.split("\n");
		// First data row should be rank 1 (Option A)
		expect(lines[5]).toContain("Option A");
		expect(lines[6]).toContain("Option B");
	});

	it("handles empty options", () => {
		const csv = generateCsv(
			makeExportData({ options: [], rankings: [], scores: {} }),
		);
		expect(csv).toContain("Test Decision");
		// Should have header row but no data rows
		const lines = csv.split("\n");
		// lines: [Decision, Description, Exported, blank, header] = 5 lines, no data rows
		expect(lines.length).toBe(5);
	});

	it("includes all metadata rows in correct positions", () => {
		const csv = generateCsv(makeExportData());
		const lines = csv.split("\n");
		expect(lines[0]).toMatch(/^Decision,/);
		expect(lines[1]).toMatch(/^Description,/);
		expect(lines[2]).toMatch(/^Exported,/);
		expect(lines[3]).toBe("");
	});

	it("includes weighted total and score in data rows", () => {
		const csv = generateCsv(makeExportData());
		const lines = csv.split("\n");
		// Option A row should contain 58 (weightedTotal) and 72.5%
		expect(lines[5]).toContain("58");
		expect(lines[5]).toContain("72.5%");
		expect(lines[5]).toContain("1"); // rank 1
	});

	it("escapes double quotes in values", () => {
		const data = makeExportData({
			decisionName: 'Decision "Alpha"',
		});
		const csv = generateCsv(data);
		// double quotes should be escaped as ""
		expect(csv).toContain('"Decision ""Alpha"""');
	});
});

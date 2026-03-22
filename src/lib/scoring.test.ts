import { describe, expect, it } from "vitest";
import type { Criterion, Option } from "../types";
import {
	computeWeightedScore,
	detectRankChanges,
	maxPossibleScore,
	rankOptions,
} from "./scoring";

function makeCriterion(
	overrides: Partial<Criterion> & { id: number; weight: number },
): Criterion {
	return {
		decisionId: 1,
		name: `Criterion ${overrides.id}`,
		description: "",
		position: 0,
		createdAt: "",
		...overrides,
	};
}

function makeOption(
	overrides: Partial<Option> & { id: number; name: string },
): Option {
	return {
		decisionId: 1,
		description: "",
		position: 0,
		createdAt: "",
		...overrides,
	};
}

describe("computeWeightedScore", () => {
	it("computes weighted total for scores and criteria", () => {
		const criteria = [
			makeCriterion({ id: 1, weight: 5.0 }),
			makeCriterion({ id: 2, weight: 3.0 }),
		];
		const scores = { 1: 8, 2: 6 };
		expect(computeWeightedScore(scores, criteria)).toBe(8 * 5 + 6 * 3);
	});

	it("uses weight overrides when provided", () => {
		const criteria = [
			makeCriterion({ id: 1, weight: 5.0 }),
			makeCriterion({ id: 2, weight: 3.0 }),
		];
		const scores = { 1: 8, 2: 6 };
		expect(computeWeightedScore(scores, criteria, { 1: 1.0 })).toBe(
			8 * 1 + 6 * 3,
		);
	});

	it("treats missing scores as 0", () => {
		const criteria = [
			makeCriterion({ id: 1, weight: 5.0 }),
			makeCriterion({ id: 2, weight: 3.0 }),
		];
		expect(computeWeightedScore({ 1: 8 }, criteria)).toBe(8 * 5);
	});

	it("returns 0 for empty criteria", () => {
		expect(computeWeightedScore({ 1: 10 }, [])).toBe(0);
	});
});

describe("maxPossibleScore", () => {
	it("computes max score as sum of 10 * weight", () => {
		const criteria = [
			makeCriterion({ id: 1, weight: 5.0 }),
			makeCriterion({ id: 2, weight: 3.0 }),
		];
		expect(maxPossibleScore(criteria)).toBe(10 * 5 + 10 * 3);
	});

	it("uses weight overrides when provided", () => {
		const criteria = [
			makeCriterion({ id: 1, weight: 5.0 }),
			makeCriterion({ id: 2, weight: 3.0 }),
		];
		expect(maxPossibleScore(criteria, { 1: 10.0 })).toBe(10 * 10 + 10 * 3);
	});

	it("returns 0 for empty criteria", () => {
		expect(maxPossibleScore([])).toBe(0);
	});
});

describe("rankOptions", () => {
	const criteria = [
		makeCriterion({ id: 1, weight: 5.0 }),
		makeCriterion({ id: 2, weight: 3.0 }),
	];
	const options = [
		makeOption({ id: 1, name: "Option A" }),
		makeOption({ id: 2, name: "Option B" }),
	];

	it("ranks options by weighted total descending", () => {
		const scoreMap = {
			1: { 1: 8, 2: 6 }, // A = 40+18 = 58
			2: { 1: 5, 2: 9 }, // B = 25+27 = 52
		};
		const ranked = rankOptions(options, scoreMap, criteria);
		expect(ranked[0].optionName).toBe("Option A");
		expect(ranked[0].rank).toBe(1);
		expect(ranked[0].weightedTotal).toBe(58);
		expect(ranked[1].optionName).toBe("Option B");
		expect(ranked[1].rank).toBe(2);
		expect(ranked[1].weightedTotal).toBe(52);
	});

	it("flips rank when weight override changes leader", () => {
		const scoreMap = {
			1: { 1: 8, 2: 6 }, // A: override w1=1 → 8+18=26
			2: { 1: 5, 2: 9 }, // B: override w1=1 → 5+27=32
		};
		const ranked = rankOptions(options, scoreMap, criteria, { 1: 1.0 });
		expect(ranked[0].optionName).toBe("Option B");
		expect(ranked[0].rank).toBe(1);
		expect(ranked[1].optionName).toBe("Option A");
		expect(ranked[1].rank).toBe(2);
	});

	it("returns normalizedScore 0 when all scores are 0", () => {
		const scoreMap = {
			1: { 1: 0, 2: 0 },
			2: { 1: 0, 2: 0 },
		};
		const ranked = rankOptions(options, scoreMap, criteria);
		for (const r of ranked) {
			expect(r.normalizedScore).toBe(0);
			expect(r.weightedTotal).toBe(0);
		}
	});

	it("ranks single option as #1", () => {
		const single = [makeOption({ id: 1, name: "Solo" })];
		const ranked = rankOptions(single, { 1: { 1: 7, 2: 5 } }, criteria);
		expect(ranked).toHaveLength(1);
		expect(ranked[0].rank).toBe(1);
	});

	it("returns empty array for no options", () => {
		expect(rankOptions([], {}, criteria)).toEqual([]);
	});

	it("handles missing scores for an option", () => {
		const scoreMap = { 1: { 1: 8, 2: 6 }, 2: {} };
		const ranked = rankOptions(options, scoreMap, criteria);
		expect(ranked[0].optionName).toBe("Option A");
		expect(ranked[1].weightedTotal).toBe(0);
	});

	it("computes 100% normalizedScore for perfect scores", () => {
		const single = [makeOption({ id: 1, name: "Perfect" })];
		const ranked = rankOptions(single, { 1: { 1: 10, 2: 10 } }, criteria);
		expect(ranked[0].normalizedScore).toBe(100);
	});

	it("handles zero-weight criteria without division errors", () => {
		const zeroCriteria = [makeCriterion({ id: 1, weight: 0 })];
		const single = [makeOption({ id: 1, name: "Test" })];
		const ranked = rankOptions(single, { 1: { 1: 10 } }, zeroCriteria);
		expect(ranked[0].weightedTotal).toBe(0);
		expect(ranked[0].normalizedScore).toBe(0);
	});
});

describe("detectRankChanges", () => {
	it("detects when options swap rank positions", () => {
		const baseline = [
			{
				optionId: 1,
				optionName: "A",
				weightedTotal: 58,
				normalizedScore: 72.5,
				rank: 1,
				scores: {},
			},
			{
				optionId: 2,
				optionName: "B",
				weightedTotal: 52,
				normalizedScore: 65,
				rank: 2,
				scores: {},
			},
		];
		const current = [
			{
				optionId: 2,
				optionName: "B",
				weightedTotal: 32,
				normalizedScore: 80,
				rank: 1,
				scores: {},
			},
			{
				optionId: 1,
				optionName: "A",
				weightedTotal: 26,
				normalizedScore: 65,
				rank: 2,
				scores: {},
			},
		];
		const changes = detectRankChanges(baseline, current);
		expect(changes).toHaveLength(2);
		expect(changes.find((c) => c.optionId === 1)?.newRank).toBe(2);
		expect(changes.find((c) => c.optionId === 2)?.newRank).toBe(1);
	});

	it("returns empty when no rank changes", () => {
		const same = [
			{
				optionId: 1,
				optionName: "A",
				weightedTotal: 58,
				normalizedScore: 72.5,
				rank: 1,
				scores: {},
			},
			{
				optionId: 2,
				optionName: "B",
				weightedTotal: 52,
				normalizedScore: 65,
				rank: 2,
				scores: {},
			},
		];
		expect(detectRankChanges(same, same)).toEqual([]);
	});

	it("ignores options not in baseline", () => {
		const baseline = [
			{
				optionId: 1,
				optionName: "A",
				weightedTotal: 58,
				normalizedScore: 72.5,
				rank: 1,
				scores: {},
			},
		];
		const current = [
			{
				optionId: 1,
				optionName: "A",
				weightedTotal: 58,
				normalizedScore: 72.5,
				rank: 1,
				scores: {},
			},
			{
				optionId: 3,
				optionName: "C",
				weightedTotal: 40,
				normalizedScore: 50,
				rank: 2,
				scores: {},
			},
		];
		expect(detectRankChanges(baseline, current)).toEqual([]);
	});
});

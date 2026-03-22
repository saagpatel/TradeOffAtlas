import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock db module before importing stores — db.ts imports @tauri-apps/plugin-sql
// which is only available inside the Tauri runtime
vi.mock("../lib/db");

import { detectRankChanges, rankOptions } from "../lib/scoring";
import type { Criterion, Option } from "../types";
import { useSensitivityStore } from "./sensitivity-store";

// ---------------------------------------------------------------------------
// Factories
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Store reset helper
// ---------------------------------------------------------------------------

const store = useSensitivityStore;

beforeEach(() => {
	store.setState({
		weightOverrides: {},
		baselineWeights: {},
		visibleOptionIds: [],
	});
});

// ---------------------------------------------------------------------------
// loadFromDecision
// ---------------------------------------------------------------------------

describe("loadFromDecision", () => {
	it("snapshots baselineWeights and weightOverrides from criteria weights", () => {
		const criteria = [
			makeCriterion({ id: 1, weight: 5 }),
			makeCriterion({ id: 2, weight: 3 }),
		];

		store.getState().loadFromDecision(criteria, [10, 20]);

		const state = store.getState();
		expect(state.baselineWeights).toEqual({ 1: 5, 2: 3 });
		expect(state.weightOverrides).toEqual({ 1: 5, 2: 3 });
	});

	it("sets all provided optionIds as visible", () => {
		const criteria = [makeCriterion({ id: 1, weight: 1 })];

		store.getState().loadFromDecision(criteria, [10, 20, 30]);

		expect(store.getState().visibleOptionIds).toEqual([10, 20, 30]);
	});

	it("does not share references between baseline and overrides", () => {
		const criteria = [makeCriterion({ id: 1, weight: 5 })];
		store.getState().loadFromDecision(criteria, []);

		store.getState().setWeightOverride(1, 9);

		expect(store.getState().baselineWeights[1]).toBe(5);
		expect(store.getState().weightOverrides[1]).toBe(9);
	});
});

// ---------------------------------------------------------------------------
// setWeightOverride
// ---------------------------------------------------------------------------

describe("setWeightOverride", () => {
	it("updates a single criterion weight without affecting others", () => {
		store.setState({
			weightOverrides: { 1: 5, 2: 3 },
			baselineWeights: { 1: 5, 2: 3 },
			visibleOptionIds: [],
		});

		store.getState().setWeightOverride(1, 8);

		const { weightOverrides } = store.getState();
		expect(weightOverrides[1]).toBe(8);
		expect(weightOverrides[2]).toBe(3); // unchanged
	});

	it("adds a new criterion entry when not previously present", () => {
		store.setState({
			weightOverrides: {},
			baselineWeights: {},
			visibleOptionIds: [],
		});

		store.getState().setWeightOverride(99, 4.5);

		expect(store.getState().weightOverrides[99]).toBe(4.5);
	});
});

// ---------------------------------------------------------------------------
// resetToBaseline
// ---------------------------------------------------------------------------

describe("resetToBaseline", () => {
	it("restores weightOverrides to the snapshotted baselineWeights", () => {
		store.setState({
			weightOverrides: { 1: 9, 2: 1 },
			baselineWeights: { 1: 5, 2: 3 },
			visibleOptionIds: [],
		});

		store.getState().resetToBaseline();

		expect(store.getState().weightOverrides).toEqual({ 1: 5, 2: 3 });
	});

	it("does not mutate baselineWeights", () => {
		store.setState({
			weightOverrides: { 1: 9 },
			baselineWeights: { 1: 5 },
			visibleOptionIds: [],
		});

		store.getState().resetToBaseline();

		expect(store.getState().baselineWeights).toEqual({ 1: 5 });
	});
});

// ---------------------------------------------------------------------------
// toggleOptionVisibility
// ---------------------------------------------------------------------------

describe("toggleOptionVisibility", () => {
	it("removes an optionId that is currently visible", () => {
		store.setState({
			weightOverrides: {},
			baselineWeights: {},
			visibleOptionIds: [1, 2, 3],
		});

		store.getState().toggleOptionVisibility(2);

		expect(store.getState().visibleOptionIds).toEqual([1, 3]);
	});

	it("adds an optionId that is not currently visible", () => {
		store.setState({
			weightOverrides: {},
			baselineWeights: {},
			visibleOptionIds: [1, 3],
		});

		store.getState().toggleOptionVisibility(2);

		expect(store.getState().visibleOptionIds).toContain(2);
	});

	it("removes then re-adds an optionId correctly", () => {
		store.setState({
			weightOverrides: {},
			baselineWeights: {},
			visibleOptionIds: [1, 2],
		});

		store.getState().toggleOptionVisibility(2);
		expect(store.getState().visibleOptionIds).not.toContain(2);

		store.getState().toggleOptionVisibility(2);
		expect(store.getState().visibleOptionIds).toContain(2);
	});
});

// ---------------------------------------------------------------------------
// updateBaseline
// ---------------------------------------------------------------------------

describe("updateBaseline", () => {
	it("replaces baselineWeights with the new values", () => {
		store.setState({
			weightOverrides: { 1: 5, 2: 3 },
			baselineWeights: { 1: 5, 2: 3 },
			visibleOptionIds: [],
		});

		store.getState().updateBaseline({ 1: 8, 2: 8 });

		expect(store.getState().baselineWeights).toEqual({ 1: 8, 2: 8 });
	});

	it("does not change weightOverrides when updating baseline", () => {
		store.setState({
			weightOverrides: { 1: 7 },
			baselineWeights: { 1: 5 },
			visibleOptionIds: [],
		});

		store.getState().updateBaseline({ 1: 9 });

		expect(store.getState().weightOverrides).toEqual({ 1: 7 }); // unchanged
	});
});

// ---------------------------------------------------------------------------
// Derived scoring — testing the underlying functions directly
// (hooks can't be called outside a React component)
// ---------------------------------------------------------------------------

describe("rankOptions with weight overrides (simulates useSensitivityRanking)", () => {
	const criteria = [
		makeCriterion({ id: 1, weight: 5 }),
		makeCriterion({ id: 2, weight: 3 }),
	];
	const options = [
		makeOption({ id: 1, name: "Option A" }),
		makeOption({ id: 2, name: "Option B" }),
	];
	// Baseline: A=58, B=52 → A#1, B#2
	const scoreMap: Record<number, Record<number, number>> = {
		1: { 1: 8, 2: 6 }, // A = 40+18 = 58
		2: { 1: 5, 2: 9 }, // B = 25+27 = 52
	};

	it("produces baseline ranking A#1, B#2 with original weights", () => {
		const ranked = rankOptions(options, scoreMap, criteria);
		expect(ranked[0].optionName).toBe("Option A");
		expect(ranked[0].rank).toBe(1);
		expect(ranked[1].optionName).toBe("Option B");
		expect(ranked[1].rank).toBe(2);
	});

	it("re-ranks to B#1, A#2 when criterion 1 weight is lowered to 1", () => {
		// A: 8*1 + 6*3 = 26, B: 5*1 + 9*3 = 32 → B wins
		const overrides: Record<number, number> = { 1: 1 };
		const ranked = rankOptions(options, scoreMap, criteria, overrides);
		expect(ranked[0].optionName).toBe("Option B");
		expect(ranked[0].rank).toBe(1);
		expect(ranked[1].optionName).toBe("Option A");
		expect(ranked[1].rank).toBe(2);
	});
});

describe("detectRankChanges (simulates useRankChanges)", () => {
	it("detects rank swap when weight override changes leader", () => {
		const criteria = [
			makeCriterion({ id: 1, weight: 5 }),
			makeCriterion({ id: 2, weight: 3 }),
		];
		const options = [
			makeOption({ id: 1, name: "Option A" }),
			makeOption({ id: 2, name: "Option B" }),
		];
		const scoreMap: Record<number, Record<number, number>> = {
			1: { 1: 8, 2: 6 },
			2: { 1: 5, 2: 9 },
		};

		const baselineRanking = rankOptions(options, scoreMap, criteria);
		const overriddenRanking = rankOptions(options, scoreMap, criteria, {
			1: 1,
		});

		const changes = detectRankChanges(baselineRanking, overriddenRanking);

		expect(changes).toHaveLength(2);
		const changeA = changes.find((c) => c.optionId === 1);
		const changeB = changes.find((c) => c.optionId === 2);
		expect(changeA?.previousRank).toBe(1);
		expect(changeA?.newRank).toBe(2);
		expect(changeB?.previousRank).toBe(2);
		expect(changeB?.newRank).toBe(1);
	});

	it("returns empty array when weight override does not change any rank", () => {
		const criteria = [makeCriterion({ id: 1, weight: 5 })];
		const options = [
			makeOption({ id: 1, name: "Option A" }),
			makeOption({ id: 2, name: "Option B" }),
		];
		const scoreMap: Record<number, Record<number, number>> = {
			1: { 1: 9 },
			2: { 1: 6 },
		};

		const baselineRanking = rankOptions(options, scoreMap, criteria);
		// Lowering weight keeps A ahead since scores A=9 > B=6
		const overriddenRanking = rankOptions(options, scoreMap, criteria, {
			1: 2,
		});

		const changes = detectRankChanges(baselineRanking, overriddenRanking);
		expect(changes).toHaveLength(0);
	});
});

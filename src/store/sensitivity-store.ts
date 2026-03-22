import { useMemo } from "react";
import { create } from "zustand";
import { detectRankChanges, rankOptions } from "../lib/scoring";
import type { Criterion } from "../types";
import { useDecisionStore } from "./decision-store";

interface SensitivityStoreState {
	weightOverrides: Record<number, number>;
	baselineWeights: Record<number, number>;
	visibleOptionIds: number[];

	loadFromDecision: (criteria: Criterion[], optionIds: number[]) => void;
	setWeightOverride: (criterionId: number, weight: number) => void;
	resetToBaseline: () => void;
	toggleOptionVisibility: (optionId: number) => void;
	updateBaseline: (newWeights: Record<number, number>) => void;
}

export const useSensitivityStore = create<SensitivityStoreState>(
	(set, get) => ({
		weightOverrides: {},
		baselineWeights: {},
		visibleOptionIds: [],

		loadFromDecision: (criteria, optionIds) => {
			const weights: Record<number, number> = {};
			for (const c of criteria) {
				weights[c.id] = c.weight;
			}
			set({
				baselineWeights: { ...weights },
				weightOverrides: { ...weights },
				visibleOptionIds: [...optionIds],
			});
		},

		setWeightOverride: (criterionId, weight) => {
			set((state) => ({
				weightOverrides: {
					...state.weightOverrides,
					[criterionId]: weight,
				},
			}));
		},

		resetToBaseline: () => {
			const { baselineWeights } = get();
			set({ weightOverrides: { ...baselineWeights } });
		},

		toggleOptionVisibility: (optionId) => {
			set((state) => {
				const idx = state.visibleOptionIds.indexOf(optionId);
				if (idx === -1) {
					return { visibleOptionIds: [...state.visibleOptionIds, optionId] };
				}
				return {
					visibleOptionIds: state.visibleOptionIds.filter(
						(id) => id !== optionId,
					),
				};
			});
		},

		updateBaseline: (newWeights) => {
			set({ baselineWeights: { ...newWeights } });
		},
	}),
);

// Hook: compute rankings with current weight overrides
export function useSensitivityRanking() {
	const options = useDecisionStore((s) => s.options);
	const criteria = useDecisionStore((s) => s.criteria);
	const scores = useDecisionStore((s) => s.scores);
	const weightOverrides = useSensitivityStore((s) => s.weightOverrides);

	return useMemo(
		() => rankOptions(options, scores, criteria, weightOverrides),
		[options, scores, criteria, weightOverrides],
	);
}

// Hook: compute rankings with baseline weights
export function useBaselineRanking() {
	const options = useDecisionStore((s) => s.options);
	const criteria = useDecisionStore((s) => s.criteria);
	const scores = useDecisionStore((s) => s.scores);
	const baselineWeights = useSensitivityStore((s) => s.baselineWeights);

	return useMemo(
		() => rankOptions(options, scores, criteria, baselineWeights),
		[options, scores, criteria, baselineWeights],
	);
}

// Hook: detect rank changes between baseline and current
export function useRankChanges() {
	const baseline = useBaselineRanking();
	const current = useSensitivityRanking();

	return useMemo(
		() => detectRankChanges(baseline, current),
		[baseline, current],
	);
}

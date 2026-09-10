import type { Criterion, Option, OptionScore, RankChange } from "../types";

export type SensitivityStatus =
	| "stable"
	| "reordered"
	| "flipped"
	| "tied"
	| "empty";

export interface SensitivitySummary {
	baselineLeader: OptionScore | null;
	currentLeader: OptionScore | null;
	baselineMargin: number | null;
	currentMargin: number | null;
	rankChangeCount: number;
	status: SensitivityStatus;
}

/** Compute weighted score for a single option given criteria weights */
export function computeWeightedScore(
	scores: Record<number, number>,
	criteria: Criterion[],
	weightOverrides?: Record<number, number>,
): number {
	return criteria.reduce((total, c) => {
		const weight = weightOverrides?.[c.id] ?? c.weight;
		const score = scores[c.id] ?? 0;
		return total + score * weight;
	}, 0);
}

/** Compute max possible score (all 10s at given weights) */
export function maxPossibleScore(
	criteria: Criterion[],
	weightOverrides?: Record<number, number>,
): number {
	return criteria.reduce((total, c) => {
		const weight = weightOverrides?.[c.id] ?? c.weight;
		return total + 10 * weight;
	}, 0);
}

/** Rank all options by weighted score, return computed results */
export function rankOptions(
	options: Option[],
	scoreMap: Record<number, Record<number, number>>,
	criteria: Criterion[],
	weightOverrides?: Record<number, number>,
): OptionScore[] {
	const maxScore = maxPossibleScore(criteria, weightOverrides);
	const computed = options.map((opt) => {
		const scores = scoreMap[opt.id] ?? {};
		const weightedTotal = computeWeightedScore(
			scores,
			criteria,
			weightOverrides,
		);
		return {
			optionId: opt.id,
			optionName: opt.name,
			weightedTotal,
			normalizedScore: maxScore > 0 ? (weightedTotal / maxScore) * 100 : 0,
			rank: 0,
			scores,
		};
	});
	computed.sort((a, b) => b.weightedTotal - a.weightedTotal);
	computed.forEach((o, i) => {
		o.rank = i + 1;
	});
	return computed;
}

/** Compare ranks before/after weight override to detect swaps */
export function detectRankChanges(
	baseline: OptionScore[],
	current: OptionScore[],
): RankChange[] {
	return current
		.filter((curr) => {
			const base = baseline.find((b) => b.optionId === curr.optionId);
			return base && base.rank !== curr.rank;
		})
		.map((curr) => {
			const base = baseline.find((b) => b.optionId === curr.optionId)!;
			return {
				optionId: curr.optionId,
				optionName: curr.optionName,
				previousRank: base.rank,
				newRank: curr.rank,
				triggeredByCriterionId: -1,
			};
		});
}

/** Summarize whether the current decision is stable under the active weights. */
export function summarizeSensitivity(
	baseline: OptionScore[],
	current: OptionScore[],
): SensitivitySummary {
	const baselineLeader = baseline[0] ?? null;
	const currentLeader = current[0] ?? null;
	const baselineMargin = scoreMargin(baseline);
	const currentMargin = scoreMargin(current);
	const rankChangeCount = detectRankChanges(baseline, current).length;

	let status: SensitivityStatus = "empty";
	if (currentLeader) {
		if (currentMargin !== null && Math.abs(currentMargin) < 0.0001) {
			status = "tied";
		} else if (baselineLeader && currentLeader.optionId !== baselineLeader.optionId) {
			status = "flipped";
		} else if (rankChangeCount > 0) {
			status = "reordered";
		} else {
			status = "stable";
		}
	}

	return {
		baselineLeader,
		currentLeader,
		baselineMargin,
		currentMargin,
		rankChangeCount,
		status,
	};
}

function scoreMargin(ranking: OptionScore[]): number | null {
	if (ranking.length < 2) return null;
	return ranking[0].weightedTotal - ranking[1].weightedTotal;
}

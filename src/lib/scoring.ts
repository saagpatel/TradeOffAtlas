import type { Criterion, Option, OptionScore, RankChange } from "../types";

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

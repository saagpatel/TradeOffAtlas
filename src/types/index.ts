export interface Decision {
	id: number;
	name: string;
	description: string;
	status: "active" | "archived";
	outcome: string;
	outcomeNotes: string;
	templateId: number | null;
	createdAt: string;
	updatedAt: string;
	archivedAt: string | null;
}

export interface Option {
	id: number;
	decisionId: number;
	name: string;
	description: string;
	position: number;
	createdAt: string;
}

export interface Criterion {
	id: number;
	decisionId: number;
	name: string;
	weight: number;
	description: string;
	position: number;
	createdAt: string;
}

export interface Score {
	id: number;
	decisionId: number;
	optionId: number;
	criterionId: number;
	score: number;
	updatedAt: string;
}

export interface Template {
	id: number;
	name: string;
	description: string;
	category: string;
	useCount: number;
	createdAt: string;
	updatedAt: string;
	criteria?: TemplateCriterion[];
}

export interface TemplateCriterion {
	id: number;
	templateId: number;
	name: string;
	weight: number;
	description: string;
	position: number;
}

export interface OptionScore {
	optionId: number;
	optionName: string;
	weightedTotal: number;
	normalizedScore: number;
	rank: number;
	scores: Record<number, number>;
}

export interface SensitivityState {
	weightOverrides: Record<number, number>;
	rankChanges: RankChange[];
}

export interface RankChange {
	optionId: number;
	optionName: string;
	previousRank: number;
	newRank: number;
	triggeredByCriterionId: number;
}

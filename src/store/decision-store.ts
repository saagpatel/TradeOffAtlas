import { create } from "zustand";
import * as db from "../lib/db";
import type { Criterion, Decision, Option } from "../types";

interface DecisionState {
	decisions: Decision[];
	activeDecisionId: number | null;
	options: Option[];
	criteria: Criterion[];
	scores: Record<number, Record<number, number>>;
	loading: boolean;

	loadDecisions: () => Promise<void>;
	setActiveDecision: (id: number | null) => Promise<void>;
	createAndActivateDecision: (data: {
		name: string;
		description?: string;
		templateId?: number | null;
	}) => Promise<void>;
	addOption: (name: string, description?: string) => Promise<void>;
	updateOptionField: (
		id: number,
		data: { name?: string; description?: string },
	) => void;
	removeOption: (id: number) => Promise<void>;
	addCriterion: (
		name: string,
		weight?: number,
		description?: string,
	) => Promise<void>;
	updateCriterionField: (
		id: number,
		data: { name?: string; weight?: number; description?: string },
	) => void;
	removeCriterion: (id: number) => Promise<void>;
	setScore: (optionId: number, criterionId: number, score: number) => void;
	updateDecisionField: (data: { name?: string; description?: string }) => void;
}

export const useDecisionStore = create<DecisionState>((set, get) => ({
	decisions: [],
	activeDecisionId: null,
	options: [],
	criteria: [],
	scores: {},
	loading: false,

	loadDecisions: async () => {
		const all = await db.getDecisions();
		set({ decisions: all.filter((d) => d.status === "active") });
	},

	setActiveDecision: async (id) => {
		if (id === null) {
			set({
				activeDecisionId: null,
				options: [],
				criteria: [],
				scores: {},
			});
			return;
		}

		set({ loading: true });
		try {
			const [options, criteria, scores] = await Promise.all([
				db.getOptions(id),
				db.getCriteria(id),
				db.getScores(id),
			]);
			set({ activeDecisionId: id, options, criteria, scores, loading: false });
		} catch (err) {
			set({ loading: false });
			console.error("Failed to load decision:", err);
			throw err;
		}
	},

	createAndActivateDecision: async (data) => {
		const decision = await db.createDecision({
			name: data.name,
			description: data.description,
			templateId: data.templateId,
		});

		await get().loadDecisions();
		await get().setActiveDecision(decision.id);
	},

	addOption: async (name, description) => {
		const { activeDecisionId } = get();
		if (activeDecisionId === null) return;

		const newOption = await db.createOption({
			decisionId: activeDecisionId,
			name,
			description,
		});

		set((state) => ({
			options: [...state.options, newOption],
			scores: {
				...state.scores,
				[newOption.id]: {},
			},
		}));
	},

	updateOptionField: (id, data) => {
		set((state) => ({
			options: state.options.map((o) => (o.id === id ? { ...o, ...data } : o)),
		}));
		db.updateOption(id, data).catch((err: unknown) => {
			console.error("Failed to update option:", err);
		});
	},

	removeOption: async (id) => {
		await db.deleteOption(id);
		set((state) => {
			const scores = { ...state.scores };
			delete scores[id];
			return {
				options: state.options.filter((o) => o.id !== id),
				scores,
			};
		});
	},

	addCriterion: async (name, weight, description) => {
		const { activeDecisionId } = get();
		if (activeDecisionId === null) return;

		const newCriterion = await db.createCriterion({
			decisionId: activeDecisionId,
			name,
			weight,
			description,
		});

		set((state) => ({
			criteria: [...state.criteria, newCriterion],
		}));
	},

	updateCriterionField: (id, data) => {
		set((state) => ({
			criteria: state.criteria.map((c) =>
				c.id === id ? { ...c, ...data } : c,
			),
		}));
		db.updateCriterion(id, data).catch((err: unknown) => {
			console.error("Failed to update criterion:", err);
		});
	},

	removeCriterion: async (id) => {
		await db.deleteCriterion(id);
		set((state) => {
			const scores: Record<number, Record<number, number>> = {};
			for (const [optId, optScores] of Object.entries(state.scores)) {
				const filtered = { ...optScores };
				delete filtered[id];
				scores[Number(optId)] = filtered;
			}
			return {
				criteria: state.criteria.filter((c) => c.id !== id),
				scores,
			};
		});
	},

	setScore: (optionId, criterionId, score) => {
		set((state) => ({
			scores: {
				...state.scores,
				[optionId]: {
					...(state.scores[optionId] ?? {}),
					[criterionId]: score,
				},
			},
		}));
		const { activeDecisionId } = get();
		if (activeDecisionId === null) return;
		db.upsertScore({
			decisionId: activeDecisionId,
			optionId,
			criterionId,
			score,
		}).catch((err: unknown) => {
			console.error("Failed to persist score:", err);
		});
	},

	updateDecisionField: (data) => {
		const { activeDecisionId } = get();
		if (activeDecisionId === null) return;
		set((state) => ({
			decisions: state.decisions.map((d) =>
				d.id === activeDecisionId ? { ...d, ...data } : d,
			),
		}));
		db.updateDecision(activeDecisionId, data).catch((err: unknown) => {
			console.error("Failed to update decision:", err);
		});
	},
}));

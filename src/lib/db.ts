import Database from "@tauri-apps/plugin-sql";
import type {
	Criterion,
	Decision,
	Option,
	Template,
	TemplateCriterion,
} from "../types";

// ---------- Connection singleton ----------

let db: Database | null = null;

export async function getDb(): Promise<Database> {
	if (!db) {
		db = await Database.load("sqlite:tradeoff-atlas.db");
	}
	return db;
}

// ---------- Row mapping helpers ----------

// SQLite returns snake_case columns; TypeScript uses camelCase.
// Each mapper is explicit to keep types safe.

interface DecisionRow {
	id: number;
	name: string;
	description: string;
	status: string;
	outcome: string;
	outcome_notes: string;
	template_id: number | null;
	created_at: string;
	updated_at: string;
	archived_at: string | null;
}

interface OptionRow {
	id: number;
	decision_id: number;
	name: string;
	description: string;
	position: number;
	created_at: string;
}

interface CriterionRow {
	id: number;
	decision_id: number;
	name: string;
	weight: number;
	description: string;
	position: number;
	created_at: string;
}

interface ScoreRow {
	id: number;
	decision_id: number;
	option_id: number;
	criterion_id: number;
	score: number;
	updated_at: string;
}

interface TemplateRow {
	id: number;
	name: string;
	description: string;
	category: string;
	use_count: number;
	created_at: string;
	updated_at: string;
}

interface TemplateCriterionRow {
	id: number;
	template_id: number;
	name: string;
	weight: number;
	description: string;
	position: number;
}

function mapDecision(row: DecisionRow): Decision {
	return {
		id: row.id,
		name: row.name,
		description: row.description,
		status: row.status as Decision["status"],
		outcome: row.outcome,
		outcomeNotes: row.outcome_notes,
		templateId: row.template_id,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
		archivedAt: row.archived_at,
	};
}

function mapOption(row: OptionRow): Option {
	return {
		id: row.id,
		decisionId: row.decision_id,
		name: row.name,
		description: row.description,
		position: row.position,
		createdAt: row.created_at,
	};
}

function mapCriterion(row: CriterionRow): Criterion {
	return {
		id: row.id,
		decisionId: row.decision_id,
		name: row.name,
		weight: row.weight,
		description: row.description,
		position: row.position,
		createdAt: row.created_at,
	};
}

function mapTemplate(row: TemplateRow): Template {
	return {
		id: row.id,
		name: row.name,
		description: row.description,
		category: row.category,
		useCount: row.use_count,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	};
}

function mapTemplateCriterion(row: TemplateCriterionRow): TemplateCriterion {
	return {
		id: row.id,
		templateId: row.template_id,
		name: row.name,
		weight: row.weight,
		description: row.description,
		position: row.position,
	};
}

// ---------- Decisions ----------

export async function createDecision(data: {
	name: string;
	description?: string;
	templateId?: number | null;
}): Promise<Decision> {
	const conn = await getDb();
	const result = await conn.execute(
		"INSERT INTO decisions (name, description, template_id) VALUES ($1, $2, $3)",
		[data.name, data.description ?? "", data.templateId ?? null],
	);
	const rows = await conn.select<DecisionRow[]>(
		"SELECT * FROM decisions WHERE id = $1",
		[result.lastInsertId],
	);
	return mapDecision(rows[0]);
}

export async function getDecisions(): Promise<Decision[]> {
	const conn = await getDb();
	const rows = await conn.select<DecisionRow[]>(
		"SELECT * FROM decisions ORDER BY created_at DESC",
	);
	return rows.map(mapDecision);
}

export async function getDecisionById(id: number): Promise<Decision | null> {
	const conn = await getDb();
	const rows = await conn.select<DecisionRow[]>(
		"SELECT * FROM decisions WHERE id = $1",
		[id],
	);
	return rows.length > 0 ? mapDecision(rows[0]) : null;
}

export async function updateDecision(
	id: number,
	data: { name?: string; description?: string },
): Promise<void> {
	const conn = await getDb();
	const fields: string[] = [];
	const values: unknown[] = [];
	let idx = 1;

	if (data.name !== undefined) {
		fields.push(`name = $${idx++}`);
		values.push(data.name);
	}
	if (data.description !== undefined) {
		fields.push(`description = $${idx++}`);
		values.push(data.description);
	}

	if (fields.length === 0) return;

	fields.push(`updated_at = CURRENT_TIMESTAMP`);
	values.push(id);

	await conn.execute(
		`UPDATE decisions SET ${fields.join(", ")} WHERE id = $${idx}`,
		values,
	);
}

export async function archiveDecision(
	id: number,
	data: { outcome: string; outcomeNotes?: string },
): Promise<void> {
	const conn = await getDb();
	await conn.execute(
		`UPDATE decisions
     SET status = 'archived',
         outcome = $1,
         outcome_notes = $2,
         archived_at = CURRENT_TIMESTAMP,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $3`,
		[data.outcome, data.outcomeNotes ?? "", id],
	);
}

export async function deleteDecision(id: number): Promise<void> {
	const conn = await getDb();
	await conn.execute("DELETE FROM decisions WHERE id = $1", [id]);
}

// ---------- Options ----------

export async function createOption(data: {
	decisionId: number;
	name: string;
	description?: string;
}): Promise<Option> {
	const conn = await getDb();
	// Auto-assign position as max+1
	const posRows = await conn.select<{ max_pos: number | null }[]>(
		"SELECT MAX(position) as max_pos FROM options WHERE decision_id = $1",
		[data.decisionId],
	);
	const nextPos = (posRows[0]?.max_pos ?? -1) + 1;

	const result = await conn.execute(
		"INSERT INTO options (decision_id, name, description, position) VALUES ($1, $2, $3, $4)",
		[data.decisionId, data.name, data.description ?? "", nextPos],
	);
	const rows = await conn.select<OptionRow[]>(
		"SELECT * FROM options WHERE id = $1",
		[result.lastInsertId],
	);
	return mapOption(rows[0]);
}

export async function getOptions(decisionId: number): Promise<Option[]> {
	const conn = await getDb();
	const rows = await conn.select<OptionRow[]>(
		"SELECT * FROM options WHERE decision_id = $1 ORDER BY position",
		[decisionId],
	);
	return rows.map(mapOption);
}

export async function updateOption(
	id: number,
	data: { name?: string; description?: string },
): Promise<void> {
	const conn = await getDb();
	const fields: string[] = [];
	const values: unknown[] = [];
	let idx = 1;

	if (data.name !== undefined) {
		fields.push(`name = $${idx++}`);
		values.push(data.name);
	}
	if (data.description !== undefined) {
		fields.push(`description = $${idx++}`);
		values.push(data.description);
	}

	if (fields.length === 0) return;
	values.push(id);

	await conn.execute(
		`UPDATE options SET ${fields.join(", ")} WHERE id = $${idx}`,
		values,
	);
}

export async function deleteOption(id: number): Promise<void> {
	const conn = await getDb();
	await conn.execute("DELETE FROM options WHERE id = $1", [id]);
}

export async function reorderOptions(
	items: { id: number; position: number }[],
): Promise<void> {
	const conn = await getDb();
	for (const item of items) {
		await conn.execute("UPDATE options SET position = $1 WHERE id = $2", [
			item.position,
			item.id,
		]);
	}
}

// ---------- Criteria ----------

export async function createCriterion(data: {
	decisionId: number;
	name: string;
	weight?: number;
	description?: string;
}): Promise<Criterion> {
	const conn = await getDb();
	const posRows = await conn.select<{ max_pos: number | null }[]>(
		"SELECT MAX(position) as max_pos FROM criteria WHERE decision_id = $1",
		[data.decisionId],
	);
	const nextPos = (posRows[0]?.max_pos ?? -1) + 1;

	const result = await conn.execute(
		"INSERT INTO criteria (decision_id, name, weight, description, position) VALUES ($1, $2, $3, $4, $5)",
		[
			data.decisionId,
			data.name,
			data.weight ?? 1.0,
			data.description ?? "",
			nextPos,
		],
	);
	const rows = await conn.select<CriterionRow[]>(
		"SELECT * FROM criteria WHERE id = $1",
		[result.lastInsertId],
	);
	return mapCriterion(rows[0]);
}

export async function getCriteria(decisionId: number): Promise<Criterion[]> {
	const conn = await getDb();
	const rows = await conn.select<CriterionRow[]>(
		"SELECT * FROM criteria WHERE decision_id = $1 ORDER BY position",
		[decisionId],
	);
	return rows.map(mapCriterion);
}

export async function updateCriterion(
	id: number,
	data: { name?: string; weight?: number; description?: string },
): Promise<void> {
	const conn = await getDb();
	const fields: string[] = [];
	const values: unknown[] = [];
	let idx = 1;

	if (data.name !== undefined) {
		fields.push(`name = $${idx++}`);
		values.push(data.name);
	}
	if (data.weight !== undefined) {
		fields.push(`weight = $${idx++}`);
		values.push(data.weight);
	}
	if (data.description !== undefined) {
		fields.push(`description = $${idx++}`);
		values.push(data.description);
	}

	if (fields.length === 0) return;
	values.push(id);

	await conn.execute(
		`UPDATE criteria SET ${fields.join(", ")} WHERE id = $${idx}`,
		values,
	);
}

export async function deleteCriterion(id: number): Promise<void> {
	const conn = await getDb();
	await conn.execute("DELETE FROM criteria WHERE id = $1", [id]);
}

export async function reorderCriteria(
	items: { id: number; position: number }[],
): Promise<void> {
	const conn = await getDb();
	for (const item of items) {
		await conn.execute("UPDATE criteria SET position = $1 WHERE id = $2", [
			item.position,
			item.id,
		]);
	}
}

// ---------- Scores ----------

export async function upsertScore(data: {
	decisionId: number;
	optionId: number;
	criterionId: number;
	score: number;
}): Promise<void> {
	const conn = await getDb();
	await conn.execute(
		`INSERT INTO scores (decision_id, option_id, criterion_id, score)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT(option_id, criterion_id)
     DO UPDATE SET score = $4, updated_at = CURRENT_TIMESTAMP`,
		[data.decisionId, data.optionId, data.criterionId, data.score],
	);
}

export async function getScores(
	decisionId: number,
): Promise<Record<number, Record<number, number>>> {
	const conn = await getDb();
	const rows = await conn.select<ScoreRow[]>(
		"SELECT * FROM scores WHERE decision_id = $1",
		[decisionId],
	);

	const result: Record<number, Record<number, number>> = {};
	for (const row of rows) {
		if (!result[row.option_id]) {
			result[row.option_id] = {};
		}
		result[row.option_id][row.criterion_id] = row.score;
	}
	return result;
}

// ---------- Templates ----------

export async function createTemplate(data: {
	name: string;
	description?: string;
	category?: string;
}): Promise<Template> {
	const conn = await getDb();
	const result = await conn.execute(
		"INSERT INTO templates (name, description, category) VALUES ($1, $2, $3)",
		[data.name, data.description ?? "", data.category ?? ""],
	);
	const rows = await conn.select<TemplateRow[]>(
		"SELECT * FROM templates WHERE id = $1",
		[result.lastInsertId],
	);
	return mapTemplate(rows[0]);
}

export async function getTemplates(): Promise<Template[]> {
	const conn = await getDb();
	const rows = await conn.select<TemplateRow[]>(
		"SELECT * FROM templates ORDER BY use_count DESC, name ASC",
	);
	return rows.map(mapTemplate);
}

export async function getTemplateById(id: number): Promise<Template | null> {
	const conn = await getDb();
	const rows = await conn.select<TemplateRow[]>(
		"SELECT * FROM templates WHERE id = $1",
		[id],
	);
	if (rows.length === 0) return null;

	const template = mapTemplate(rows[0]);
	const criteriaRows = await conn.select<TemplateCriterionRow[]>(
		"SELECT * FROM template_criteria WHERE template_id = $1 ORDER BY position",
		[id],
	);
	template.criteria = criteriaRows.map(mapTemplateCriterion);
	return template;
}

export async function deleteTemplate(id: number): Promise<void> {
	const conn = await getDb();
	await conn.execute("DELETE FROM templates WHERE id = $1", [id]);
}

export async function incrementTemplateUseCount(id: number): Promise<void> {
	const conn = await getDb();
	await conn.execute(
		"UPDATE templates SET use_count = use_count + 1, updated_at = CURRENT_TIMESTAMP WHERE id = $1",
		[id],
	);
}

export async function createTemplateCriteria(
	templateId: number,
	criteria: {
		name: string;
		weight: number;
		description: string;
		position: number;
	}[],
): Promise<void> {
	const conn = await getDb();
	for (const c of criteria) {
		await conn.execute(
			"INSERT INTO template_criteria (template_id, name, weight, description, position) VALUES ($1, $2, $3, $4, $5)",
			[templateId, c.name, c.weight, c.description, c.position],
		);
	}
}

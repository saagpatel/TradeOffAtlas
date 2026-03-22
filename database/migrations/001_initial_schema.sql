-- Tradeoff Atlas: Initial Schema
-- 6 tables: decisions, options, criteria, scores, templates, template_criteria

CREATE TABLE IF NOT EXISTS decisions (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT    NOT NULL,
    description   TEXT    DEFAULT '',
    status        TEXT    NOT NULL DEFAULT 'active',
    outcome       TEXT    DEFAULT '',
    outcome_notes TEXT    DEFAULT '',
    template_id   INTEGER REFERENCES templates(id) ON DELETE SET NULL,
    created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
    archived_at   DATETIME DEFAULT NULL
);
CREATE INDEX IF NOT EXISTS idx_decisions_status ON decisions(status);

CREATE TABLE IF NOT EXISTS options (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    decision_id INTEGER NOT NULL REFERENCES decisions(id) ON DELETE CASCADE,
    name        TEXT    NOT NULL,
    description TEXT    DEFAULT '',
    position    INTEGER NOT NULL DEFAULT 0,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_options_decision ON options(decision_id);

CREATE TABLE IF NOT EXISTS criteria (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    decision_id INTEGER NOT NULL REFERENCES decisions(id) ON DELETE CASCADE,
    name        TEXT    NOT NULL,
    weight      REAL    NOT NULL DEFAULT 1.0,
    description TEXT    DEFAULT '',
    position    INTEGER NOT NULL DEFAULT 0,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_criteria_decision ON criteria(decision_id);

CREATE TABLE IF NOT EXISTS scores (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    decision_id  INTEGER NOT NULL REFERENCES decisions(id) ON DELETE CASCADE,
    option_id    INTEGER NOT NULL REFERENCES options(id) ON DELETE CASCADE,
    criterion_id INTEGER NOT NULL REFERENCES criteria(id) ON DELETE CASCADE,
    score        INTEGER NOT NULL DEFAULT 0 CHECK(score >= 0 AND score <= 10),
    updated_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(option_id, criterion_id)
);
CREATE INDEX IF NOT EXISTS idx_scores_decision ON scores(decision_id);
CREATE INDEX IF NOT EXISTS idx_scores_option ON scores(option_id);

CREATE TABLE IF NOT EXISTS templates (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT    NOT NULL,
    description TEXT    DEFAULT '',
    category    TEXT    DEFAULT '',
    use_count   INTEGER NOT NULL DEFAULT 0,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS template_criteria (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    template_id INTEGER NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
    name        TEXT    NOT NULL,
    weight      REAL    NOT NULL DEFAULT 1.0,
    description TEXT    DEFAULT '',
    position    INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_template_criteria_template ON template_criteria(template_id);

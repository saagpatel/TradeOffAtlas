-- Tradeoff Atlas: durable backup metadata and atomic template cloning

CREATE TABLE backup_manifest (
    id                 INTEGER PRIMARY KEY CHECK(id = 1),
    format_version     INTEGER NOT NULL,
    app_id             TEXT    NOT NULL,
    app_version        TEXT    NOT NULL,
    schema_version     INTEGER NOT NULL,
    created_at_unix_ms INTEGER NOT NULL
);

-- Creating a decision from a template must be one SQLite transaction. The
-- trigger runs inside the INSERT statement so a crash cannot leave a decision
-- with only some of its template criteria.
CREATE TRIGGER clone_template_criteria_after_decision_insert
AFTER INSERT ON decisions
WHEN NEW.template_id IS NOT NULL
BEGIN
    INSERT INTO criteria (
        decision_id,
        name,
        weight,
        description,
        position
    )
    SELECT
        NEW.id,
        name,
        weight,
        description,
        position
    FROM template_criteria
    WHERE template_id = NEW.template_id
    ORDER BY position;

    UPDATE templates
    SET use_count = use_count + 1,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.template_id;
END;

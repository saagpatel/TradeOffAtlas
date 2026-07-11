use serde::{Deserialize, Serialize};
use sqlx::migrate::Migrator;
use sqlx::sqlite::{SqliteConnectOptions, SqliteJournalMode, SqlitePoolOptions, SqliteSynchronous};
use sqlx::{Connection, Row, SqliteConnection};
use std::ffi::OsString;
use std::fs::{self, File, OpenOptions};
use std::io::Write;
use std::path::{Path, PathBuf};
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, Manager};

const APP_ID: &str = "com.tradeoffatlas.app";
const DATABASE_FILENAME: &str = "tradeoff-atlas.db";
const BACKUP_FORMAT_VERSION: i64 = 1;
const CURRENT_SCHEMA_VERSION: i64 = 2;
const MIN_SUPPORTED_SCHEMA_VERSION: i64 = 1;
const RESTORE_MARKER_FILENAME: &str = ".tradeoff-atlas-restore-state.json";
const RESTORE_STAGING_FILENAME: &str = ".tradeoff-atlas-restore-staging.db";
const RESTORE_ROLLBACK_FILENAME: &str = ".tradeoff-atlas-restore-rollback.db";

static MIGRATOR: Migrator = sqlx::migrate!("../database/migrations");

type DurabilityResult<T> = Result<T, DurabilityError>;

#[derive(Debug, Serialize)]
pub struct DurabilityError {
    code: &'static str,
    message: String,
}

impl DurabilityError {
    fn new(code: &'static str, message: impl Into<String>) -> Self {
        Self {
            code,
            message: message.into(),
        }
    }
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct InitializationResult {
    recovered_interrupted_restore: bool,
    schema_version: i64,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BackupResult {
    path: String,
    schema_version: i64,
    created_at_unix_ms: i64,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RestoreResult {
    automatic_backup_path: String,
    schema_version: i64,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RollbackResult {
    rolled_back: bool,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TemplateCriterionInput {
    name: String,
    weight: f64,
    description: String,
    position: i64,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateTemplateInput {
    name: String,
    description: String,
    category: String,
    criteria: Vec<TemplateCriterionInput>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TemplateResult {
    id: i64,
    name: String,
    description: String,
    category: String,
    use_count: i64,
    created_at: String,
    updated_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct RestoreMarker {
    marker_version: i64,
    phase: String,
    automatic_backup_path: String,
    source_filename: String,
    schema_version: i64,
}

#[tauri::command]
pub async fn initialize_database(app: AppHandle) -> DurabilityResult<InitializationResult> {
    let database_path = application_database_path(&app)?;
    tauri::async_runtime::spawn(async move {
        let recovered_interrupted_restore = recover_interrupted_restore(&database_path).await?;
        let schema_version = migrate_and_validate(&database_path, true).await?;

        Ok(InitializationResult {
            recovered_interrupted_restore,
            schema_version,
        })
    })
    .await
    .map_err(runtime_join_error)?
}

#[tauri::command]
pub async fn create_backup(app: AppHandle, destination: String) -> DurabilityResult<BackupResult> {
    let database_path = application_database_path(&app)?;
    tauri::async_runtime::spawn(async move {
        create_backup_at(
            &database_path,
            Path::new(&destination),
            env!("CARGO_PKG_VERSION"),
        )
        .await
    })
    .await
    .map_err(runtime_join_error)?
}

#[tauri::command]
pub async fn begin_restore(app: AppHandle, source: String) -> DurabilityResult<RestoreResult> {
    let database_path = application_database_path(&app)?;
    tauri::async_runtime::spawn(async move {
        begin_restore_at(
            &database_path,
            Path::new(&source),
            env!("CARGO_PKG_VERSION"),
            false,
        )
        .await
    })
    .await
    .map_err(runtime_join_error)?
}

#[tauri::command]
pub async fn finalize_restore(app: AppHandle) -> DurabilityResult<RestoreResult> {
    let database_path = application_database_path(&app)?;
    tauri::async_runtime::spawn(async move { finalize_restore_at(&database_path).await })
        .await
        .map_err(runtime_join_error)?
}

#[tauri::command]
pub async fn rollback_restore(app: AppHandle) -> DurabilityResult<RollbackResult> {
    let database_path = application_database_path(&app)?;
    tauri::async_runtime::spawn(async move {
        let rolled_back = rollback_restore_at(&database_path).await?;
        Ok(RollbackResult { rolled_back })
    })
    .await
    .map_err(runtime_join_error)?
}

#[tauri::command]
pub async fn create_template_with_criteria(
    app: AppHandle,
    input: CreateTemplateInput,
) -> DurabilityResult<TemplateResult> {
    let database_path = application_database_path(&app)?;
    tauri::async_runtime::spawn(
        async move { create_template_transaction(&database_path, input).await },
    )
    .await
    .map_err(runtime_join_error)?
}

fn runtime_join_error(error: tauri::Error) -> DurabilityError {
    DurabilityError::new(
        "RUNTIME_FAILURE",
        format!("The background database task could not finish: {error}"),
    )
}

fn application_database_path(app: &AppHandle) -> DurabilityResult<PathBuf> {
    let app_config_dir = app.path().app_config_dir().map_err(|error| {
        DurabilityError::new(
            "APP_PATH_UNAVAILABLE",
            format!("The application data directory is unavailable: {error}"),
        )
    })?;
    Ok(app_config_dir.join(DATABASE_FILENAME))
}

fn write_connect_options(path: &Path, create_if_missing: bool) -> SqliteConnectOptions {
    SqliteConnectOptions::new()
        .filename(path)
        .create_if_missing(create_if_missing)
        .foreign_keys(true)
        .journal_mode(SqliteJournalMode::Wal)
        .synchronous(SqliteSynchronous::Full)
        .busy_timeout(Duration::from_secs(5))
}

fn plain_write_connect_options(path: &Path, create_if_missing: bool) -> SqliteConnectOptions {
    SqliteConnectOptions::new()
        .filename(path)
        .create_if_missing(create_if_missing)
        .foreign_keys(true)
        .busy_timeout(Duration::from_secs(5))
}

fn read_connect_options(path: &Path) -> SqliteConnectOptions {
    SqliteConnectOptions::new()
        .filename(path)
        .create_if_missing(false)
        .read_only(true)
        .foreign_keys(true)
        .busy_timeout(Duration::from_secs(5))
}

async fn connect_write(path: &Path, create_if_missing: bool) -> DurabilityResult<SqliteConnection> {
    SqliteConnection::connect_with(&write_connect_options(path, create_if_missing))
        .await
        .map_err(|error| database_error("Could not open the database for writing", error))
}

async fn connect_plain_write(
    path: &Path,
    create_if_missing: bool,
) -> DurabilityResult<SqliteConnection> {
    SqliteConnection::connect_with(&plain_write_connect_options(path, create_if_missing))
        .await
        .map_err(|error| database_error("Could not open the database for writing", error))
}

async fn connect_read(path: &Path) -> DurabilityResult<SqliteConnection> {
    SqliteConnection::connect_with(&read_connect_options(path))
        .await
        .map_err(|error| database_error("Could not open the database", error))
}

fn database_error(context: &str, error: sqlx::Error) -> DurabilityError {
    let detail = error.to_string();
    let lowered = detail.to_ascii_lowercase();
    let code = if lowered.contains("not a database")
        || lowered.contains("file is encrypted")
        || lowered.contains("malformed")
    {
        "MALFORMED_DATABASE"
    } else if lowered.contains("readonly")
        || lowered.contains("permission")
        || lowered.contains("disk full")
        || lowered.contains("database or disk is full")
        || lowered.contains("unable to open database file")
        || lowered.contains("unable to open database:")
    {
        "IO_FAILURE"
    } else {
        "DATABASE_ERROR"
    };
    DurabilityError::new(code, format!("{context}: {detail}"))
}

fn io_error(context: &str, error: std::io::Error) -> DurabilityError {
    let code = match error.kind() {
        std::io::ErrorKind::PermissionDenied => "PERMISSION_FAILURE",
        std::io::ErrorKind::NotFound => "PATH_NOT_FOUND",
        std::io::ErrorKind::AlreadyExists => "DESTINATION_EXISTS",
        _ => "IO_FAILURE",
    };
    DurabilityError::new(code, format!("{context}: {error}"))
}

async fn migrate_and_validate(path: &Path, create_if_missing: bool) -> DurabilityResult<i64> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)
            .map_err(|error| io_error("Could not create the application data directory", error))?;
    }

    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect_with(write_connect_options(path, create_if_missing))
        .await
        .map_err(|error| database_error("Could not open the database for migration", error))?;
    let mut connection = pool
        .acquire()
        .await
        .map_err(|error| database_error("Could not acquire the migration connection", error))?;
    let before = inspect_connection(&mut connection, true).await?;
    if before > CURRENT_SCHEMA_VERSION {
        return Err(unsupported_newer_schema(before));
    }
    drop(connection);

    MIGRATOR.run(&pool).await.map_err(|error| {
        DurabilityError::new(
            "MIGRATION_FAILED",
            format!("Database migration failed and was rolled back before the app opened: {error}"),
        )
    })?;

    let mut connection = pool
        .acquire()
        .await
        .map_err(|error| database_error("Could not reacquire the migrated database", error))?;
    let version = inspect_connection(&mut connection, false).await?;
    if version != CURRENT_SCHEMA_VERSION {
        return Err(DurabilityError::new(
            "SCHEMA_VERSION_MISMATCH",
            format!(
                "Expected schema version {CURRENT_SCHEMA_VERSION} after migration, found {version}."
            ),
        ));
    }
    drop(connection);
    pool.close().await;
    checkpoint_database(path).await?;
    Ok(version)
}

async fn validate_database(path: &Path, allow_prior_schema: bool) -> DurabilityResult<i64> {
    if !path.is_file() {
        return Err(DurabilityError::new(
            "PATH_NOT_FOUND",
            format!("No database file exists at {}.", path.display()),
        ));
    }
    let mut connection = connect_read(path).await?;
    let version = inspect_connection(&mut connection, false).await?;
    if version > CURRENT_SCHEMA_VERSION {
        return Err(unsupported_newer_schema(version));
    }
    if version < MIN_SUPPORTED_SCHEMA_VERSION
        || (!allow_prior_schema && version != CURRENT_SCHEMA_VERSION)
    {
        return Err(DurabilityError::new(
            "INCOMPATIBLE_SCHEMA",
            format!(
                "Schema version {version} is not supported. Supported versions are {MIN_SUPPORTED_SCHEMA_VERSION} through {CURRENT_SCHEMA_VERSION}."
            ),
        ));
    }
    connection
        .close()
        .await
        .map_err(|error| database_error("Could not close the validated database", error))?;
    Ok(version)
}

async fn inspect_connection(
    connection: &mut SqliteConnection,
    allow_empty_database: bool,
) -> DurabilityResult<i64> {
    let integrity_rows: Vec<String> = sqlx::query_scalar("PRAGMA integrity_check")
        .fetch_all(&mut *connection)
        .await
        .map_err(|error| database_error("SQLite integrity check could not run", error))?;
    if integrity_rows.len() != 1 || !integrity_rows[0].eq_ignore_ascii_case("ok") {
        return Err(DurabilityError::new(
            "INTEGRITY_FAILURE",
            format!(
                "SQLite integrity check failed: {}",
                integrity_rows.join("; ")
            ),
        ));
    }

    if sqlx::query("PRAGMA foreign_key_check")
        .fetch_optional(&mut *connection)
        .await
        .map_err(|error| database_error("SQLite foreign-key check could not run", error))?
        .is_some()
    {
        return Err(DurabilityError::new(
            "INTEGRITY_FAILURE",
            "SQLite foreign-key validation failed.",
        ));
    }

    let migrations_table_exists: i64 = sqlx::query_scalar(
        "SELECT EXISTS(SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = '_sqlx_migrations')",
    )
    .fetch_one(&mut *connection)
    .await
    .map_err(|error| database_error("Could not inspect migration metadata", error))?;

    if migrations_table_exists == 0 {
        let user_table_count: i64 = sqlx::query_scalar(
            "SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'",
        )
        .fetch_one(&mut *connection)
        .await
        .map_err(|error| database_error("Could not inspect database tables", error))?;
        if allow_empty_database && user_table_count == 0 {
            return Ok(0);
        }
        return Err(DurabilityError::new(
            "MIGRATION_METADATA_MISSING",
            "The database contains application tables but no migration history.",
        ));
    }

    let failed_migration_count: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM _sqlx_migrations WHERE success = 0")
            .fetch_one(&mut *connection)
            .await
            .map_err(|error| database_error("Could not inspect migration status", error))?;
    if failed_migration_count > 0 {
        return Err(DurabilityError::new(
            "INTERRUPTED_MIGRATION",
            "The database records an interrupted or failed migration and was not opened.",
        ));
    }

    let version: i64 = sqlx::query_scalar::<_, Option<i64>>(
        "SELECT MAX(version) FROM _sqlx_migrations WHERE success = 1",
    )
    .fetch_one(&mut *connection)
    .await
    .map_err(|error| database_error("Could not read the schema version", error))?
    .unwrap_or(0);

    if version > CURRENT_SCHEMA_VERSION {
        return Err(unsupported_newer_schema(version));
    }
    if version < MIN_SUPPORTED_SCHEMA_VERSION {
        return Err(DurabilityError::new(
            "INCOMPATIBLE_SCHEMA",
            format!("Schema version {version} predates the oldest supported version."),
        ));
    }

    let required_tables: &[&str] = if version >= 2 {
        &[
            "decisions",
            "options",
            "criteria",
            "scores",
            "templates",
            "template_criteria",
            "backup_manifest",
        ]
    } else {
        &[
            "decisions",
            "options",
            "criteria",
            "scores",
            "templates",
            "template_criteria",
        ]
    };

    for table in required_tables {
        let exists: i64 = sqlx::query_scalar(
            "SELECT EXISTS(SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?)",
        )
        .bind(table)
        .fetch_one(&mut *connection)
        .await
        .map_err(|error| database_error("Could not inspect the schema", error))?;
        if exists == 0 {
            return Err(DurabilityError::new(
                "SCHEMA_VALIDATION_FAILED",
                format!("Required table '{table}' is missing."),
            ));
        }
    }

    Ok(version)
}

fn unsupported_newer_schema(version: i64) -> DurabilityError {
    DurabilityError::new(
        "NEWER_SCHEMA_UNSUPPORTED",
        format!(
            "This backup uses schema version {version}, but this app supports up to version {CURRENT_SCHEMA_VERSION}. Update the app before restoring it."
        ),
    )
}

async fn vacuum_into(source: &Path, destination: &Path) -> DurabilityResult<()> {
    if destination.exists() {
        return Err(DurabilityError::new(
            "DESTINATION_EXISTS",
            format!("Refusing to overwrite {}.", destination.display()),
        ));
    }
    let mut connection = connect_read(source).await?;
    sqlx::query("VACUUM INTO ?")
        .bind(destination.to_string_lossy().to_string())
        .execute(&mut connection)
        .await
        .map_err(|error| database_error("SQLite could not create a consistent snapshot", error))?;
    connection
        .close()
        .await
        .map_err(|error| database_error("Could not close the snapshot source", error))?;
    sync_file(destination)?;
    Ok(())
}

async fn create_backup_at(
    source: &Path,
    destination: &Path,
    app_version: &str,
) -> DurabilityResult<BackupResult> {
    let schema_version = validate_database(source, false).await?;
    if destination.exists() {
        return Err(DurabilityError::new(
            "DESTINATION_EXISTS",
            "Choose a new backup filename; existing backups are never overwritten.",
        ));
    }
    let parent = destination.parent().ok_or_else(|| {
        DurabilityError::new(
            "INVALID_DESTINATION",
            "The backup destination has no parent directory.",
        )
    })?;
    if !parent.is_dir() {
        return Err(DurabilityError::new(
            "PATH_NOT_FOUND",
            format!("The backup directory {} does not exist.", parent.display()),
        ));
    }

    let temporary = temporary_sibling(destination, "backup");
    let created_at_unix_ms = now_unix_ms()?;
    let operation = async {
        vacuum_into(source, &temporary).await?;
        write_backup_manifest(&temporary, app_version, schema_version, created_at_unix_ms).await?;
        validate_database(&temporary, false).await?;
        sync_file(&temporary)?;
        fs::rename(&temporary, destination)
            .map_err(|error| io_error("Could not publish the completed backup", error))?;
        sync_parent(destination)?;
        Ok::<(), DurabilityError>(())
    }
    .await;

    if operation.is_err() {
        let _ = remove_database_files(&temporary);
    }
    operation?;

    Ok(BackupResult {
        path: destination.to_string_lossy().to_string(),
        schema_version,
        created_at_unix_ms,
    })
}

async fn write_backup_manifest(
    path: &Path,
    app_version: &str,
    schema_version: i64,
    created_at_unix_ms: i64,
) -> DurabilityResult<()> {
    let mut connection = connect_plain_write(path, false).await?;
    let mut transaction = connection.begin().await.map_err(|error| {
        database_error("Could not start the backup metadata transaction", error)
    })?;
    sqlx::query("DELETE FROM backup_manifest")
        .execute(&mut *transaction)
        .await
        .map_err(|error| database_error("Could not reset backup metadata", error))?;
    sqlx::query(
        "INSERT INTO backup_manifest (id, format_version, app_id, app_version, schema_version, created_at_unix_ms) VALUES (1, ?, ?, ?, ?, ?)",
    )
    .bind(BACKUP_FORMAT_VERSION)
    .bind(APP_ID)
    .bind(app_version)
    .bind(schema_version)
    .bind(created_at_unix_ms)
    .execute(&mut *transaction)
    .await
    .map_err(|error| database_error("Could not write portable backup metadata", error))?;
    transaction
        .commit()
        .await
        .map_err(|error| database_error("Could not commit portable backup metadata", error))?;
    connection
        .close()
        .await
        .map_err(|error| database_error("Could not close the completed backup", error))?;
    Ok(())
}

async fn begin_restore_at(
    active: &Path,
    source: &Path,
    app_version: &str,
    simulate_interruption_after_active_move: bool,
) -> DurabilityResult<RestoreResult> {
    recover_interrupted_restore(active).await?;
    validate_database(active, false).await?;
    validate_database(source, true).await?;

    let paths = RestorePaths::new(active)?;
    remove_database_files(&paths.staging)?;
    remove_database_files(&paths.rollback)?;

    vacuum_into(source, &paths.staging).await?;
    migrate_and_validate(&paths.staging, false).await?;
    checkpoint_database(&paths.staging).await?;

    let automatic_backup = automatic_backup_path(active)?;
    let backup = create_backup_at(active, &automatic_backup, app_version).await?;
    checkpoint_database(active).await?;

    let mut marker = RestoreMarker {
        marker_version: 1,
        phase: "prepared".to_string(),
        automatic_backup_path: backup.path.clone(),
        source_filename: source
            .file_name()
            .and_then(|name| name.to_str())
            .unwrap_or("selected backup")
            .to_string(),
        schema_version: CURRENT_SCHEMA_VERSION,
    };
    write_restore_marker(&paths.marker, &marker)?;

    fs::rename(active, &paths.rollback).map_err(|error| {
        io_error(
            "Could not preserve the current database before restore",
            error,
        )
    })?;
    sync_parent(active)?;
    marker.phase = "active_moved".to_string();
    write_restore_marker(&paths.marker, &marker)?;

    if simulate_interruption_after_active_move {
        return Err(DurabilityError::new(
            "SIMULATED_INTERRUPTION",
            "Simulated interruption after preserving the active database.",
        ));
    }

    let install_result = async {
        fs::rename(&paths.staging, active)
            .map_err(|error| io_error("Could not install the validated restore", error))?;
        sync_parent(active)?;
        marker.phase = "replacement_installed".to_string();
        write_restore_marker(&paths.marker, &marker)?;
        validate_database(active, false).await?;
        Ok::<(), DurabilityError>(())
    }
    .await;

    if let Err(install_error) = install_result {
        let rollback_result = rollback_restore_at(active).await;
        return match rollback_result {
            Ok(true) => Err(DurabilityError::new(
                "RESTORE_ROLLED_BACK",
                format!(
                    "The restore failed, so the original database was restored automatically: {}",
                    install_error.message
                ),
            )),
            Ok(false) => Err(install_error),
            Err(rollback_error) => Err(DurabilityError::new(
                "ROLLBACK_FAILED",
                format!(
                    "Restore failed ({}) and rollback also failed ({}). The automatic backup is at {}.",
                    install_error.message, rollback_error.message, backup.path
                ),
            )),
        };
    }

    Ok(RestoreResult {
        automatic_backup_path: backup.path,
        schema_version: CURRENT_SCHEMA_VERSION,
    })
}

async fn finalize_restore_at(active: &Path) -> DurabilityResult<RestoreResult> {
    validate_database(active, false).await?;
    let paths = RestorePaths::new(active)?;
    let marker = read_restore_marker(&paths.marker)?;
    if marker.phase != "replacement_installed" {
        return Err(DurabilityError::new(
            "RESTORE_NOT_READY",
            format!("Restore cannot be finalized from phase '{}'.", marker.phase),
        ));
    }

    fs::remove_file(&paths.marker)
        .map_err(|error| io_error("Could not commit the restore marker", error))?;
    sync_parent(active)?;
    remove_database_files(&paths.rollback)?;
    remove_database_files(&paths.staging)?;

    Ok(RestoreResult {
        automatic_backup_path: marker.automatic_backup_path,
        schema_version: marker.schema_version,
    })
}

async fn rollback_restore_at(active: &Path) -> DurabilityResult<bool> {
    let paths = RestorePaths::new(active)?;
    if !paths.rollback.exists() {
        if paths.marker.exists() && active.exists() {
            remove_database_files(&paths.staging)?;
            fs::remove_file(&paths.marker)
                .map_err(|error| io_error("Could not clear the restore marker", error))?;
            sync_parent(active)?;
        }
        return Ok(false);
    }

    let failed_replacement = paths.parent.join(format!(
        ".tradeoff-atlas-failed-restore-{}.db",
        unique_suffix()
    ));
    if active.exists() {
        checkpoint_database(active).await?;
        fs::rename(active, &failed_replacement)
            .map_err(|error| io_error("Could not preserve the failed restore", error))?;
    }
    fs::rename(&paths.rollback, active)
        .map_err(|error| io_error("Could not roll back to the original database", error))?;
    sync_parent(active)?;

    if let Err(validation_error) = validate_database(active, false).await {
        if failed_replacement.exists() {
            let _ = fs::rename(active, &paths.rollback);
            let _ = fs::rename(&failed_replacement, active);
            let _ = sync_parent(active);
        }
        return Err(DurabilityError::new(
            "ROLLBACK_VALIDATION_FAILED",
            format!(
                "The preserved database failed validation: {}",
                validation_error.message
            ),
        ));
    }

    remove_database_files(&failed_replacement)?;
    remove_database_files(&paths.staging)?;
    if paths.marker.exists() {
        fs::remove_file(&paths.marker)
            .map_err(|error| io_error("Could not clear the restore marker", error))?;
    }
    sync_parent(active)?;
    Ok(true)
}

async fn recover_interrupted_restore(active: &Path) -> DurabilityResult<bool> {
    let paths = RestorePaths::new(active)?;
    if paths.marker.exists() {
        if paths.rollback.exists() {
            return rollback_restore_at(active).await;
        }
        if !active.exists() {
            return Err(DurabilityError::new(
                "RECOVERY_REQUIRED",
                format!(
                    "An interrupted restore left no active or rollback database. Use the automatic backup recorded in {}.",
                    paths.marker.display()
                ),
            ));
        }
        validate_database(active, false).await?;
        remove_database_files(&paths.staging)?;
        fs::remove_file(&paths.marker)
            .map_err(|error| io_error("Could not clear the stale restore marker", error))?;
        sync_parent(active)?;
        return Ok(false);
    }

    if paths.rollback.exists() {
        if active.exists() {
            validate_database(active, false).await?;
            remove_database_files(&paths.rollback)?;
            sync_parent(active)?;
            return Ok(false);
        }
        fs::rename(&paths.rollback, active)
            .map_err(|error| io_error("Could not recover the preserved database", error))?;
        sync_parent(active)?;
        validate_database(active, false).await?;
        return Ok(true);
    }

    Ok(false)
}

async fn checkpoint_database(path: &Path) -> DurabilityResult<()> {
    if !path.exists() {
        return Ok(());
    }
    let mut connection = connect_plain_write(path, false).await?;
    sqlx::query("PRAGMA wal_checkpoint(TRUNCATE)")
        .fetch_one(&mut connection)
        .await
        .map_err(|error| database_error("Could not checkpoint the SQLite WAL", error))?;
    connection
        .close()
        .await
        .map_err(|error| database_error("Could not close the checkpointed database", error))?;

    for (sidecar, is_wal) in [
        (sidecar_path(path, "-wal"), true),
        (sidecar_path(path, "-shm"), false),
    ] {
        if sidecar.exists() {
            let metadata = fs::metadata(&sidecar)
                .map_err(|error| io_error("Could not inspect a SQLite sidecar", error))?;
            if is_wal && metadata.len() > 0 {
                return Err(DurabilityError::new(
                    "WAL_CHECKPOINT_FAILED",
                    format!(
                        "SQLite WAL {} still contains data after checkpoint.",
                        sidecar.display()
                    ),
                ));
            }
            fs::remove_file(&sidecar).map_err(|error| {
                io_error("Could not remove a checkpointed SQLite sidecar", error)
            })?;
        }
    }
    sync_file(path)?;
    Ok(())
}

async fn create_template_transaction(
    path: &Path,
    input: CreateTemplateInput,
) -> DurabilityResult<TemplateResult> {
    if input.name.trim().is_empty() || input.criteria.is_empty() {
        return Err(DurabilityError::new(
            "INVALID_TEMPLATE",
            "A template needs a name and at least one criterion.",
        ));
    }
    if input.criteria.iter().any(|criterion| {
        criterion.name.trim().is_empty() || !criterion.weight.is_finite() || criterion.weight < 0.0
    }) {
        return Err(DurabilityError::new(
            "INVALID_TEMPLATE",
            "Every template criterion needs a name and a non-negative finite weight.",
        ));
    }

    let mut connection = connect_write(path, false).await?;
    let mut transaction = connection
        .begin()
        .await
        .map_err(|error| database_error("Could not start the template transaction", error))?;
    let insert =
        sqlx::query("INSERT INTO templates (name, description, category) VALUES (?, ?, ?)")
            .bind(input.name.trim())
            .bind(input.description.trim())
            .bind(input.category.trim())
            .execute(&mut *transaction)
            .await
            .map_err(|error| database_error("Could not create the template", error))?;
    let template_id = insert.last_insert_rowid();

    for criterion in &input.criteria {
        sqlx::query(
            "INSERT INTO template_criteria (template_id, name, weight, description, position) VALUES (?, ?, ?, ?, ?)",
        )
        .bind(template_id)
        .bind(criterion.name.trim())
        .bind(criterion.weight)
        .bind(criterion.description.trim())
        .bind(criterion.position)
        .execute(&mut *transaction)
        .await
        .map_err(|error| database_error("Could not save all template criteria", error))?;
    }

    transaction
        .commit()
        .await
        .map_err(|error| database_error("Could not commit the template", error))?;
    let row = sqlx::query(
        "SELECT id, name, description, category, use_count, created_at, updated_at FROM templates WHERE id = ?",
    )
    .bind(template_id)
    .fetch_one(&mut connection)
    .await
    .map_err(|error| database_error("Could not read the saved template", error))?;

    let result = TemplateResult {
        id: row.get("id"),
        name: row.get("name"),
        description: row.get("description"),
        category: row.get("category"),
        use_count: row.get("use_count"),
        created_at: row.get("created_at"),
        updated_at: row.get("updated_at"),
    };
    connection
        .close()
        .await
        .map_err(|error| database_error("Could not close the template transaction", error))?;
    Ok(result)
}

struct RestorePaths {
    parent: PathBuf,
    marker: PathBuf,
    staging: PathBuf,
    rollback: PathBuf,
}

impl RestorePaths {
    fn new(active: &Path) -> DurabilityResult<Self> {
        let parent = active.parent().ok_or_else(|| {
            DurabilityError::new(
                "APP_PATH_UNAVAILABLE",
                "The database has no parent directory.",
            )
        })?;
        Ok(Self {
            parent: parent.to_path_buf(),
            marker: parent.join(RESTORE_MARKER_FILENAME),
            staging: parent.join(RESTORE_STAGING_FILENAME),
            rollback: parent.join(RESTORE_ROLLBACK_FILENAME),
        })
    }
}

fn automatic_backup_path(active: &Path) -> DurabilityResult<PathBuf> {
    let parent = active.parent().ok_or_else(|| {
        DurabilityError::new(
            "APP_PATH_UNAVAILABLE",
            "The database has no parent directory.",
        )
    })?;
    let backup_dir = parent.join("backups");
    fs::create_dir_all(&backup_dir)
        .map_err(|error| io_error("Could not create the automatic backup directory", error))?;
    Ok(backup_dir.join(format!(
        "pre-restore-{}.tradeoff-atlas.sqlite3",
        unique_suffix()
    )))
}

fn temporary_sibling(destination: &Path, label: &str) -> PathBuf {
    let filename = destination
        .file_name()
        .and_then(|name| name.to_str())
        .unwrap_or("tradeoff-atlas.sqlite3");
    destination.with_file_name(format!(".{filename}.{label}.{}.tmp", unique_suffix()))
}

fn unique_suffix() -> String {
    format!(
        "{}-{}",
        SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|duration| duration.as_nanos())
            .unwrap_or_default(),
        std::process::id()
    )
}

fn now_unix_ms() -> DurabilityResult<i64> {
    let millis = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|error| {
            DurabilityError::new(
                "CLOCK_ERROR",
                format!("The system clock is invalid: {error}"),
            )
        })?
        .as_millis();
    i64::try_from(millis).map_err(|_| {
        DurabilityError::new(
            "CLOCK_ERROR",
            "The current timestamp is outside the supported range.",
        )
    })
}

fn write_restore_marker(path: &Path, marker: &RestoreMarker) -> DurabilityResult<()> {
    let temporary = path.with_extension("json.tmp");
    let bytes = serde_json::to_vec_pretty(marker).map_err(|error| {
        DurabilityError::new(
            "RESTORE_MARKER_FAILED",
            format!("Could not serialize restore state: {error}"),
        )
    })?;
    let mut file = OpenOptions::new()
        .create(true)
        .truncate(true)
        .write(true)
        .open(&temporary)
        .map_err(|error| io_error("Could not create the restore marker", error))?;
    file.write_all(&bytes)
        .map_err(|error| io_error("Could not write the restore marker", error))?;
    file.sync_all()
        .map_err(|error| io_error("Could not sync the restore marker", error))?;
    fs::rename(&temporary, path)
        .map_err(|error| io_error("Could not publish the restore marker", error))?;
    sync_parent(path)
}

fn read_restore_marker(path: &Path) -> DurabilityResult<RestoreMarker> {
    let bytes = fs::read(path).map_err(|error| io_error("Could not read restore state", error))?;
    serde_json::from_slice(&bytes).map_err(|error| {
        DurabilityError::new(
            "RESTORE_MARKER_INVALID",
            format!("Restore state is malformed: {error}"),
        )
    })
}

fn sidecar_path(path: &Path, suffix: &str) -> PathBuf {
    let mut value: OsString = path.as_os_str().to_os_string();
    value.push(suffix);
    PathBuf::from(value)
}

fn remove_database_files(path: &Path) -> DurabilityResult<()> {
    for candidate in [
        path.to_path_buf(),
        sidecar_path(path, "-wal"),
        sidecar_path(path, "-shm"),
    ] {
        if candidate.exists() {
            fs::remove_file(&candidate)
                .map_err(|error| io_error("Could not remove a temporary database file", error))?;
        }
    }
    Ok(())
}

fn sync_file(path: &Path) -> DurabilityResult<()> {
    File::open(path)
        .and_then(|file| file.sync_all())
        .map_err(|error| io_error("Could not sync a database file", error))
}

fn sync_parent(path: &Path) -> DurabilityResult<()> {
    let parent = path.parent().ok_or_else(|| {
        DurabilityError::new("APP_PATH_UNAVAILABLE", "The path has no parent directory.")
    })?;
    File::open(parent)
        .and_then(|directory| directory.sync_all())
        .map_err(|error| io_error("Could not sync database directory metadata", error))
}

#[cfg(test)]
mod tests {
    use super::*;
    use sqlx::migrate::Migrate;
    use tempfile::TempDir;

    async fn create_fixture(path: &Path, version: i64) {
        let mut connection = connect_write(path, true).await.unwrap();
        connection.ensure_migrations_table().await.unwrap();
        for migration in MIGRATOR
            .iter()
            .filter(|migration| migration.version <= version)
        {
            connection.apply(migration).await.unwrap();
        }
        connection.close().await.unwrap();
        checkpoint_database(path).await.unwrap();
    }

    async fn create_legacy_plugin_v1_fixture(path: &Path) {
        let mut connection = connect_write(path, true).await.unwrap();
        connection.ensure_migrations_table().await.unwrap();
        let migration = sqlx::migrate::Migration::new(
            1,
            "create_initial_schema".into(),
            sqlx::migrate::MigrationType::ReversibleUp,
            include_str!("../../database/migrations/001_initial_schema.sql").into(),
            false,
        );
        connection.apply(&migration).await.unwrap();
        connection.close().await.unwrap();
        checkpoint_database(path).await.unwrap();
    }

    async fn insert_decision(path: &Path, name: &str) {
        let mut connection = connect_write(path, false).await.unwrap();
        sqlx::query("INSERT INTO decisions (name) VALUES (?)")
            .bind(name)
            .execute(&mut connection)
            .await
            .unwrap();
        connection.close().await.unwrap();
    }

    async fn decision_names(path: &Path) -> Vec<String> {
        let mut connection = connect_read(path).await.unwrap();
        let names = sqlx::query_scalar("SELECT name FROM decisions ORDER BY id")
            .fetch_all(&mut connection)
            .await
            .unwrap();
        connection.close().await.unwrap();
        names
    }

    #[tokio::test]
    async fn migrates_prior_schema_transactionally_to_current() {
        let temp = TempDir::new().unwrap();
        let database = temp.path().join("prior.db");
        create_legacy_plugin_v1_fixture(&database).await;
        insert_decision(&database, "Keep me").await;

        let version = migrate_and_validate(&database, false).await.unwrap();

        assert_eq!(version, CURRENT_SCHEMA_VERSION);
        assert_eq!(decision_names(&database).await, vec!["Keep me"]);
    }

    #[tokio::test]
    async fn backup_reads_committed_wal_and_writes_portable_manifest() {
        let temp = TempDir::new().unwrap();
        let active = temp.path().join("active.db");
        let backup = temp.path().join("portable.tradeoff-atlas.sqlite3");
        create_fixture(&active, CURRENT_SCHEMA_VERSION).await;

        let mut writer = connect_write(&active, false).await.unwrap();
        sqlx::query("INSERT INTO decisions (name) VALUES ('Committed in WAL')")
            .execute(&mut writer)
            .await
            .unwrap();

        let result = create_backup_at(&active, &backup, "1.0.0").await.unwrap();
        assert_eq!(result.schema_version, CURRENT_SCHEMA_VERSION);
        assert_eq!(decision_names(&backup).await, vec!["Committed in WAL"]);

        let mut connection = connect_read(&backup).await.unwrap();
        let row = sqlx::query(
            "SELECT app_id, app_version, schema_version, format_version FROM backup_manifest WHERE id = 1",
        )
        .fetch_one(&mut connection)
        .await
        .unwrap();
        assert_eq!(row.get::<String, _>("app_id"), APP_ID);
        assert_eq!(row.get::<String, _>("app_version"), "1.0.0");
        assert_eq!(row.get::<i64, _>("schema_version"), CURRENT_SCHEMA_VERSION);
        assert_eq!(row.get::<i64, _>("format_version"), BACKUP_FORMAT_VERSION);
        writer.close().await.unwrap();
        connection.close().await.unwrap();
    }

    #[tokio::test]
    async fn restores_prior_schema_through_staging_and_keeps_pre_restore_backup() {
        let temp = TempDir::new().unwrap();
        let active = temp.path().join(DATABASE_FILENAME);
        let source = temp.path().join("prior.db");
        create_fixture(&active, CURRENT_SCHEMA_VERSION).await;
        insert_decision(&active, "Original").await;
        create_legacy_plugin_v1_fixture(&source).await;
        insert_decision(&source, "Imported prior schema").await;

        let result = begin_restore_at(&active, &source, "1.0.0", false)
            .await
            .unwrap();
        assert_eq!(decision_names(&active).await, vec!["Imported prior schema"]);
        assert!(Path::new(&result.automatic_backup_path).is_file());
        assert_eq!(
            validate_database(&active, false).await.unwrap(),
            CURRENT_SCHEMA_VERSION
        );

        finalize_restore_at(&active).await.unwrap();
        assert!(!RestorePaths::new(&active).unwrap().marker.exists());
    }

    #[tokio::test]
    async fn rejects_malformed_database_without_touching_active_data() {
        let temp = TempDir::new().unwrap();
        let active = temp.path().join(DATABASE_FILENAME);
        let malformed = temp.path().join("malformed.db");
        create_fixture(&active, CURRENT_SCHEMA_VERSION).await;
        insert_decision(&active, "Original").await;
        fs::write(&malformed, b"not a sqlite database").unwrap();

        let error = begin_restore_at(&active, &malformed, "1.0.0", false)
            .await
            .unwrap_err();
        assert_eq!(error.code, "MALFORMED_DATABASE");
        assert_eq!(decision_names(&active).await, vec!["Original"]);
    }

    #[tokio::test]
    async fn rejects_newer_schema_without_touching_active_data() {
        let temp = TempDir::new().unwrap();
        let active = temp.path().join(DATABASE_FILENAME);
        let newer = temp.path().join("newer.db");
        create_fixture(&active, CURRENT_SCHEMA_VERSION).await;
        insert_decision(&active, "Original").await;
        create_fixture(&newer, CURRENT_SCHEMA_VERSION).await;
        let mut connection = connect_write(&newer, false).await.unwrap();
        let future = sqlx::migrate::Migration::new(
            99,
            "future_schema".into(),
            sqlx::migrate::MigrationType::Simple,
            "CREATE TABLE future_data (id INTEGER PRIMARY KEY);".into(),
            false,
        );
        connection.apply(&future).await.unwrap();
        connection.close().await.unwrap();

        let error = begin_restore_at(&active, &newer, "1.0.0", false)
            .await
            .unwrap_err();
        assert_eq!(error.code, "NEWER_SCHEMA_UNSUPPORTED");
        assert_eq!(decision_names(&active).await, vec!["Original"]);
    }

    #[tokio::test]
    async fn rejects_interrupted_migration_fixture() {
        let temp = TempDir::new().unwrap();
        let database = temp.path().join("interrupted.db");
        create_fixture(&database, CURRENT_SCHEMA_VERSION).await;
        let mut connection = connect_write(&database, false).await.unwrap();
        sqlx::query("UPDATE _sqlx_migrations SET success = 0 WHERE version = ?")
            .bind(CURRENT_SCHEMA_VERSION)
            .execute(&mut connection)
            .await
            .unwrap();
        connection.close().await.unwrap();

        let error = validate_database(&database, true).await.unwrap_err();
        assert_eq!(error.code, "INTERRUPTED_MIGRATION");
    }

    #[tokio::test]
    async fn rejects_integrity_failure_fixture() {
        let temp = TempDir::new().unwrap();
        let database = temp.path().join("integrity.db");
        create_fixture(&database, CURRENT_SCHEMA_VERSION).await;
        let mut connection = connect_write(&database, false).await.unwrap();
        sqlx::query("PRAGMA foreign_keys = OFF")
            .execute(&mut connection)
            .await
            .unwrap();
        sqlx::query(
            "INSERT INTO scores (decision_id, option_id, criterion_id, score) VALUES (999, 999, 999, 5)",
        )
        .execute(&mut connection)
        .await
        .unwrap();
        connection.close().await.unwrap();

        let error = validate_database(&database, true).await.unwrap_err();
        assert_eq!(error.code, "INTEGRITY_FAILURE");
    }

    #[tokio::test]
    async fn recovers_original_after_interrupted_restore_swap() {
        let temp = TempDir::new().unwrap();
        let active = temp.path().join(DATABASE_FILENAME);
        let source = temp.path().join("source.db");
        create_fixture(&active, CURRENT_SCHEMA_VERSION).await;
        insert_decision(&active, "Original").await;
        create_fixture(&source, CURRENT_SCHEMA_VERSION).await;
        insert_decision(&source, "Replacement").await;

        let error = begin_restore_at(&active, &source, "1.0.0", true)
            .await
            .unwrap_err();
        assert_eq!(error.code, "SIMULATED_INTERRUPTION");
        assert!(!active.exists());

        assert!(recover_interrupted_restore(&active).await.unwrap());
        assert_eq!(decision_names(&active).await, vec!["Original"]);
    }

    #[tokio::test]
    async fn reports_unwritable_backup_destination() {
        let temp = TempDir::new().unwrap();
        let active = temp.path().join(DATABASE_FILENAME);
        create_fixture(&active, CURRENT_SCHEMA_VERSION).await;
        let destination = temp.path().join("missing").join("backup.db");

        let error = create_backup_at(&active, &destination, "1.0.0")
            .await
            .unwrap_err();
        assert_eq!(error.code, "PATH_NOT_FOUND");
    }

    #[cfg(unix)]
    #[tokio::test]
    async fn reports_permission_failure_for_read_only_backup_directory() {
        use std::os::unix::fs::PermissionsExt;

        let temp = TempDir::new().unwrap();
        let active = temp.path().join(DATABASE_FILENAME);
        create_fixture(&active, CURRENT_SCHEMA_VERSION).await;
        let locked = temp.path().join("locked");
        fs::create_dir(&locked).unwrap();
        fs::set_permissions(&locked, fs::Permissions::from_mode(0o500)).unwrap();

        let result = create_backup_at(&active, &locked.join("backup.db"), "1.0.0").await;
        fs::set_permissions(&locked, fs::Permissions::from_mode(0o700)).unwrap();

        let error = result.unwrap_err();
        assert!(
            matches!(error.code, "IO_FAILURE" | "PERMISSION_FAILURE"),
            "unexpected error {}: {}",
            error.code,
            error.message
        );
    }

    #[tokio::test]
    async fn template_creation_and_template_cloning_are_atomic_transactions() {
        let temp = TempDir::new().unwrap();
        let database = temp.path().join(DATABASE_FILENAME);
        create_fixture(&database, CURRENT_SCHEMA_VERSION).await;

        let template = create_template_transaction(
            &database,
            CreateTemplateInput {
                name: "Job offer".to_string(),
                description: "Compare offers".to_string(),
                category: "career".to_string(),
                criteria: vec![
                    TemplateCriterionInput {
                        name: "Learning".to_string(),
                        weight: 2.0,
                        description: String::new(),
                        position: 0,
                    },
                    TemplateCriterionInput {
                        name: "Compensation".to_string(),
                        weight: 1.5,
                        description: String::new(),
                        position: 1,
                    },
                ],
            },
        )
        .await
        .unwrap();

        let mut connection = connect_write(&database, false).await.unwrap();
        let decision_id =
            sqlx::query("INSERT INTO decisions (name, template_id) VALUES ('Choose', ?)")
                .bind(template.id)
                .execute(&mut connection)
                .await
                .unwrap()
                .last_insert_rowid();
        let criterion_count: i64 =
            sqlx::query_scalar("SELECT COUNT(*) FROM criteria WHERE decision_id = ?")
                .bind(decision_id)
                .fetch_one(&mut connection)
                .await
                .unwrap();
        let use_count: i64 = sqlx::query_scalar("SELECT use_count FROM templates WHERE id = ?")
            .bind(template.id)
            .fetch_one(&mut connection)
            .await
            .unwrap();
        assert_eq!(criterion_count, 2);
        assert_eq!(use_count, 1);
        connection.close().await.unwrap();
    }
}

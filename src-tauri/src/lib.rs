mod durability;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_sql::Builder::default().build())
        .invoke_handler(tauri::generate_handler![
            durability::initialize_database,
            durability::create_backup,
            durability::begin_restore,
            durability::finalize_restore,
            durability::rollback_restore,
            durability::create_template_with_criteria,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

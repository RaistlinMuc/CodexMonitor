use tauri::{AppHandle, State};

use crate::state::AppState;
use crate::storage::write_settings;
use crate::types::AppSettings;
use crate::integrations;

#[tauri::command]
pub(crate) async fn get_app_settings(state: State<'_, AppState>) -> Result<AppSettings, String> {
    let settings = state.app_settings.lock().await;
    Ok(settings.clone())
}

#[tauri::command]
pub(crate) async fn update_app_settings(
    settings: AppSettings,
    state: State<'_, AppState>,
    app: AppHandle,
) -> Result<AppSettings, String> {
    write_settings(&state.settings_path, &settings)?;
    let mut current = state.app_settings.lock().await;
    *current = settings.clone();
    tauri::async_runtime::spawn(integrations::apply_settings(app));
    Ok(settings)
}

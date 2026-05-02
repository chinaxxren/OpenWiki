use crate::commands::capture::AppState;
use crate::storage::database::Database;
use crate::storage::models::{CapturedContent, ContentListCounts, ContentListItem};
use crate::storage::repository::Repository;
use serde::Serialize;
use tauri::State;

#[derive(Serialize)]
pub struct ContentPageWithInfo {
    pub contents: Vec<CapturedContent>,
    pub total_items: i64,
    pub disk_usage_mb: f64,
}

#[derive(Serialize)]
pub struct FilteredContentListPageWithInfo {
    pub contents: Vec<ContentListItem>,
    pub matching_items: i64,
    pub disk_usage_mb: f64,
    pub counts: ContentListCounts,
}

#[tauri::command]
pub fn get_all_content(
    state: State<'_, AppState>,
    limit: Option<i64>,
    offset: Option<i64>,
) -> Result<Vec<CapturedContent>, String> {
    let repo = Repository::new(state.db.clone());
    repo.get_all_content(limit.unwrap_or(50), offset.unwrap_or(0))
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_content_page_with_info(
    state: State<'_, AppState>,
    limit: Option<i64>,
    offset: Option<i64>,
) -> Result<ContentPageWithInfo, String> {
    let lim = limit.unwrap_or(50);
    let off = offset.unwrap_or(0);
    let repo = Repository::new(state.db.clone());
    let contents = repo.get_all_content(lim, off).map_err(|e| e.to_string())?;

    let conn = state.db.conn.lock().map_err(|e| e.to_string())?;
    let total_items: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM captured_content WHERE is_deleted = 0",
            [],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    let db_path = Database::db_path();
    let disk_bytes = std::fs::metadata(&db_path).map(|m| m.len()).unwrap_or(0);
    let disk_mb = disk_bytes as f64 / (1024.0 * 1024.0);

    Ok(ContentPageWithInfo {
        contents,
        total_items,
        disk_usage_mb: disk_mb,
    })
}

#[tauri::command]
pub fn get_filtered_content_list_page_with_info(
    state: State<'_, AppState>,
    content_filter: Option<String>,
    date_from: Option<String>,
    date_to: Option<String>,
    exclude_sensitive: Option<bool>,
    limit: Option<i64>,
    offset: Option<i64>,
) -> Result<FilteredContentListPageWithInfo, String> {
    let lim = limit.unwrap_or(50);
    let off = offset.unwrap_or(0);
    let exclude_sensitive = exclude_sensitive.unwrap_or(false);
    let repo = Repository::new(state.db.clone());
    let contents = repo
        .get_filtered_content_list(
            content_filter.as_deref(),
            date_from.as_deref(),
            date_to.as_deref(),
            exclude_sensitive,
            lim,
            off,
        )
        .map_err(|e| e.to_string())?;
    let matching_items = repo
        .count_filtered_content(
            content_filter.as_deref(),
            date_from.as_deref(),
            date_to.as_deref(),
            exclude_sensitive,
        )
        .map_err(|e| e.to_string())?;
    let counts = repo
        .get_content_list_counts(date_from.as_deref(), date_to.as_deref(), exclude_sensitive)
        .map_err(|e| e.to_string())?;

    let db_path = Database::db_path();
    let disk_bytes = std::fs::metadata(&db_path).map(|m| m.len()).unwrap_or(0);
    let disk_mb = disk_bytes as f64 / (1024.0 * 1024.0);

    Ok(FilteredContentListPageWithInfo {
        contents,
        matching_items,
        disk_usage_mb: disk_mb,
        counts,
    })
}

#[tauri::command]
pub fn get_content_for_date_range(
    state: State<'_, AppState>,
    start_date: String,
    end_date: String,
) -> Result<Vec<CapturedContent>, String> {
    let repo = Repository::new(state.db.clone());
    repo.get_content_for_date_range(&start_date, &end_date)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_content(state: State<'_, AppState>, id: String) -> Result<(), String> {
    let repo = Repository::new(state.db.clone());
    // Wiki lifecycle: update source status and page confidence
    if let Err(e) = crate::ai::wiki_engine::on_content_deleted(state.db.clone(), &id) {
        log::warn!("Wiki content deletion hook failed for {}: {}", id, e);
    }
    repo.delete_content(&id).map_err(|e| e.to_string())
}

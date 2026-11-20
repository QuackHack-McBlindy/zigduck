use std::collections::HashMap;

use serde::{Deserialize, Serialize};

use super::automation::AutomationAction;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DashboardCardConfig {
    pub enable: bool,
    pub title: String,
    pub icon: String,
    pub color: String,
    pub on_click_action: Vec<AutomationAction>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DashboardConfig {
    pub cards: HashMap<String, DashboardCardConfig>,
}

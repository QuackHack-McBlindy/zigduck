use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DimmerConfig {
    pub message_key: String,
    pub actions: DimmerActions,
    #[serde(default)]
    pub double_click_timeout_ms: Option<u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DimmerActions {
    pub on_press: String,
    pub on_hold: String,
    pub off_press: String,
    pub off_hold: String,
    pub up_press: String,
    pub up_hold: String,
    pub down_press: String,
    pub down_hold: String,
}

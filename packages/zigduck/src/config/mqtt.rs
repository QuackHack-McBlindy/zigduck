use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MosquittoConfig {
    pub broker: String,
    pub user: String,
    pub password_file: Option<String>,
    #[serde(default = "default_base_topic")]
    pub base_topic: String,
    #[serde(default)]
    pub whitelist: Vec<String>,
}

fn default_base_topic() -> String {
    "zigbee2mqtt".to_string()
}

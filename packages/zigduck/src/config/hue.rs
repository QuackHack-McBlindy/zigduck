use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HueConfig {
    pub bridge_ip: Option<String>,
    pub password_file: Option<String>,
}

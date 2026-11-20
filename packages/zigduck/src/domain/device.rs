use serde::{Deserialize, Serialize};

use super::default_true;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Device {
    pub room: String,
    #[serde(rename = "type")]
    pub device_type: String,
    pub id: String,
    pub endpoint: u32,
    pub ieee: Option<String>,
    pub hue_id: Option<u16>,
    pub supports_color: Option<bool>,
    pub supports_temperature: Option<bool>,
    pub icon: Option<String>,
    pub battery_type: Option<String>,
    #[serde(default = "default_true")]
    pub enable: bool,
}

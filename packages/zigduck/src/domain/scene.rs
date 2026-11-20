use std::collections::HashMap;

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct Scene {
    #[serde(default, rename = "_aliases")]
    pub aliases: Vec<String>,
    #[serde(flatten)]
    pub devices: HashMap<String, serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SceneConfig {
    pub scenes: HashMap<String, Scene>,
}

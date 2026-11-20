use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NoMotionConfig {
    pub enabled: bool,
    pub after: u64,
    pub exclude: Vec<String>,
}

impl Default for NoMotionConfig {
    fn default() -> Self {
        Self {
            enabled: false,
            after: 180,
            exclude: Vec::new(),
        }
    }
}

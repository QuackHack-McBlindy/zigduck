use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct SimpleActionsConfig {
    #[serde(default)]
    pub prefix: String,
}

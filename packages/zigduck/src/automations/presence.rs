use ducktrace_logger::*;
use tokio::process::Command as TokioCommand;

use crate::domain::AutomationAction;
use crate::state::ZigduckState;

impl ZigduckState {
    pub async fn execute_presence_action(
        &self,
        action: &AutomationAction,
        new_state: &str,
        old_state: &str,
    ) -> Result<(), Box<dyn std::error::Error>> {
        match action {
            AutomationAction::Simple(cmd) => {
                let prefix = self.config.simple_actions.prefix.trim();
                if prefix.is_empty() {
                    self.run_presence_shell(cmd, new_state, old_state).await?;
                } else {
                    let mut parts = prefix.split_whitespace();
                    let program = parts.next().unwrap_or("sh");
                    let output = TokioCommand::new(program)
                        .args(parts)
                        .arg(cmd)
                        .env("PRESENCE_STATE", new_state)
                        .env("PRESENCE_OLD_STATE", old_state)
                        .env("AUTOMATION_DEVICE", "presence")
                        .env("AUTOMATION_ROOM", "global")
                        .output()
                        .await?;
                    if !output.status.success() {
                        dt_warning!(
                            "presence simple FAILED via '{}' (exit={:?}) cmd={:?} stderr={:?}",
                            prefix,
                            output.status.code(),
                            cmd,
                            String::from_utf8_lossy(&output.stderr).trim()
                        );
                    }
                }
            }
            AutomationAction::Structured(a) => match a.action_type.as_str() {
                "shell" => {
                    if let Some(cmd) = &a.command {
                        self.run_presence_shell(cmd, new_state, old_state).await?;
                    }
                }
                _ => {
                    self.execute_automation_action(action, "presence", "global").await?;
                }
            },
        }
        Ok(())
    }

    pub async fn run_presence_shell(
        &self,
        cmd: &str,
        new_state: &str,
        old_state: &str,
    ) -> Result<(), Box<dyn std::error::Error>> {
        dt_info!("presence shell: {} --> {} cmd={:?}", old_state, new_state, cmd);
        let output = TokioCommand::new("sh")
            .arg("-c")
            .arg(cmd)
            .env("PRESENCE_STATE", new_state)
            .env("PRESENCE_OLD_STATE", old_state)
            .env("AUTOMATION_DEVICE", "presence")
            .env("AUTOMATION_ROOM", "global")
            .output()
            .await?;

        let code = output.status.code();
        let stdout = String::from_utf8_lossy(&output.stdout);
        let stderr = String::from_utf8_lossy(&output.stderr);
        if output.status.success() {
            dt_info!(
                "presence shell ok (exit={:?}) stdout={:?} stderr={:?}",
                code,
                stdout.trim(),
                stderr.trim()
            );
        } else {
            dt_warning!(
                "presence shell FAILED (exit={:?}) cmd={:?} stdout={:?} stderr={:?}",
                code,
                cmd,
                stdout.trim(),
                stderr.trim()
            );
        }
        Ok(())
    }
}

mod automations;
mod config;
mod devices;
mod dimmer;
mod domain;
mod hue;
mod lights;
mod motion;
mod mqtt;
mod net;
mod presence;
mod scheduler;
mod scenes;
mod snapshots;
mod state;
mod tv;

use ducktrace_logger::*;
use state::ZigduckState;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let debug = std::env::var("DEBUG").is_ok();

    let state_dir = std::env::var("STATE_DIR")
        .unwrap_or_else(|_| "/var/lib/zigduck".to_string());

    let snapshots_dir = format!("{}/snapshots", state_dir);
    std::fs::create_dir_all(&snapshots_dir).unwrap_or_else(|e| {
        dt_error!("Failed to create snapshots directory {}: {}", snapshots_dir, e);
        std::process::exit(1);
    });

    let timer_dir = format!("{}/timers", state_dir);
    std::fs::create_dir_all(&timer_dir)?;

    let log_path = format!("{}/zigduck.log", state_dir);
    dt_setup(Some(log_path.as_str()), None);

    let automations_file = std::env::var("AUTOMATIONS_FILE")
        .unwrap_or_else(|_| "/etc/zigduck/automations.json".to_string());


    let devices_file = std::env::var("ZIGBEE_DEVICES_FILE")
        .unwrap_or_else(|_| "/etc/zigduck/devices.json".to_string());

    eprintln!("[🦆📜] ✅INFO✅ ⮞ State Directory: {}", state_dir);
    eprintln!("[🦆📜] ✅INFO✅ ⮞ Devices file: {}", devices_file);
    if debug { eprintln!("[🦆📜] ⁉️DEBUG⁉️ ⮞ Debug mode enabled"); }

    let mut state = ZigduckState::new(
        state_dir,
        devices_file,
        automations_file,
        debug,
    );

    state.start_listening().await
}

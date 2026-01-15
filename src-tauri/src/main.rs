// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    if let Err(err) = fix_path_env::fix() {
        eprintln!("Failed to sync PATH from shell: {err}");
    }

    let mut args = std::env::args().skip(1);
    match args.next().as_deref() {
        Some("--cloudkit-status") => {
            let container_id = args.next().unwrap_or_default();
            if container_id.trim().is_empty() {
                eprintln!("Usage: codex-monitor --cloudkit-status <container-id>");
                std::process::exit(2);
            }
            match codex_monitor_lib::cloudkit_cli_status_json(container_id) {
                Ok(payload) => {
                    println!("{payload}");
                    std::process::exit(0);
                }
                Err(error) => {
                    eprintln!("{error}");
                    std::process::exit(1);
                }
            }
        }
        Some("--cloudkit-test") => {
            let container_id = args.next().unwrap_or_default();
            if container_id.trim().is_empty() {
                eprintln!("Usage: codex-monitor --cloudkit-test <container-id>");
                std::process::exit(2);
            }
            match codex_monitor_lib::cloudkit_cli_test_json(container_id) {
                Ok(payload) => {
                    println!("{payload}");
                    std::process::exit(0);
                }
                Err(error) => {
                    eprintln!("{error}");
                    std::process::exit(1);
                }
            }
        }
        _ => {}
    }
    codex_monitor_lib::run()
}

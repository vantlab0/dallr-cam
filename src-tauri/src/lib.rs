#[tauri::command]
fn check_obs_virtual_cam() -> bool {
    #[cfg(target_os = "windows")]
    {
        use std::process::Command;
        if let Ok(output) = Command::new("reg")
            .args(["query", r"HKLM\SOFTWARE\Classes\CLSID\{A3FCE0F5-3493-419F-958A-ABA1250EC20B}"])
            .output()
        {
            if output.status.success() {
                return true;
            }
        }
    }
    false
}

#[tauri::command]
fn install_obs_virtual_cam() -> Result<String, String> {
    #[cfg(target_os = "windows")]
    {
        use std::process::Command;
        let dll_path = r"C:\Program Files\obs-studio\data\obs-plugins\win-dshow\obs-virtualcam-module64.dll";
        if std::path::Path::new(dll_path).exists() {
            let output = Command::new("regsvr32.exe")
                .args(["/i", "/s", dll_path])
                .output()
                .map_err(|e| e.to_string())?;
            if output.status.success() {
                return Ok("Registered OBS Virtual Camera DirectShow filter successfully".into());
            }
        }
        let winget = Command::new("winget")
            .args([
                "install",
                "--id=OBSProject.OBSStudio",
                "-e",
                "--silent",
                "--accept-package-agreements",
                "--accept-source-agreements",
            ])
            .output()
            .map_err(|e| e.to_string())?;
        if winget.status.success() {
            return Ok("Installed OBS Studio & Virtual Camera".into());
        }
        return Err("Unable to register driver automatically. Please run virtualcam-install.bat as administrator.".into());
    }
    #[cfg(not(target_os = "windows"))]
    {
        Ok("Virtual camera is simulated on non-Windows".into())
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            check_obs_virtual_cam,
            install_obs_virtual_cam
        ])
        .run(tauri::generate_context!())
        .expect("error while running the Dallr Studio application");
}

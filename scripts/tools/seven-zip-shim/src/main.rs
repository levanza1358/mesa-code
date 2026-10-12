//! A minimal `7za` shim for unprivileged Windows installer builds.
//!
//! electron-builder's `app-builder` binary extracts its tool bundles by running
//! `7za` from `PATH`. Go's `exec.LookPath` only resolves real executables, so a
//! `.cmd` wrapper is not enough.
//!
//! The `winCodeSign` bundle embeds macOS dylib symlinks. Creating symlinks on
//! Windows requires `SeCreateSymbolicLinkPrivilege` (admin rights or Developer
//! Mode). Without that privilege 7za aborts with "A required privilege is not
//! held by the client" and the installer build fails.
//!
//! This shim pre-creates those symlink entry paths as empty regular files, then
//! delegates to the real 7za. Windows builds only need `rcedit-x64.exe` and
//! `windows-*/signtool.exe`, which extract normally. 7za reports exit code 2
//! when only the symlink entries failed, which this shim maps to success.
//!
//! Environment:
//! - `MESA_CODE_REAL_7ZA`: absolute path to the real 7za executable (required).

use std::env;
use std::fs::{self, File};
use std::path::{Path, PathBuf};
use std::process::{exit, Command, Stdio};

/// Symlink entries shipped by the electron-builder `winCodeSign-2.6.0` bundle.
///
/// These are macOS-only OpenSSL dylib aliases. They are irrelevant to a Windows
/// build, but 7za still tries to create them and aborts the whole extraction
/// when the process lacks symlink privilege.
const KNOWN_SYMLINK_ENTRIES: &[&str] = &[
    "darwin/10.12/lib/libcrypto.1.0.0.dylib",
    "darwin/10.12/lib/libcrypto.dylib",
    "darwin/10.12/lib/libssl.1.0.0.dylib",
    "darwin/10.12/lib/libssl.dylib",
    "darwin/10.12/lib/engines/lib4758cca.dylib",
    "darwin/10.12/lib/engines/libaep.dylib",
    "darwin/10.12/lib/engines/libatalla.dylib",
    "darwin/10.12/lib/engines/libcapi.dylib",
    "darwin/10.12/lib/engines/libchil.dylib",
    "darwin/10.12/lib/engines/libcswift.dylib",
    "darwin/10.12/lib/engines/libgmp.dylib",
    "darwin/10.12/lib/engines/libgost.dylib",
    "darwin/10.12/lib/engines/libnuron.dylib",
    "darwin/10.12/lib/engines/libpadlock.dylib",
    "darwin/10.12/lib/engines/libsureware.dylib",
    "darwin/10.12/lib/engines/libubsec.dylib",
];

fn main() {
    let args: Vec<String> = env::args().skip(1).collect();

    let real_7za = match env::var("MESA_CODE_REAL_7ZA") {
        Ok(value) if !value.trim().is_empty() => value,
        _ => {
            eprintln!("[7za-shim] MESA_CODE_REAL_7ZA is not set");
            exit(1);
        }
    };

    // Only the `x` (extract) command needs symlink protection.
    let is_extract = args.first().map(|arg| arg == "x").unwrap_or(false);

    let mut forward: Vec<String> = args.clone();
    if is_extract {
        if let Some(output_dir) = parse_output_dir(&args) {
            precreate_symlink_paths(&output_dir);
        }
        // app-builder invokes `7za x -bd <archive> -o<dir>` without `-y`.
        // Because the shim pre-creates the symlink paths, 7za would prompt to
        // overwrite them; with no attached stdin it aborts with exit 255.
        // Always answer yes for the automated extraction.
        if !args.iter().any(|arg| arg == "-y") {
            forward.push("-y".to_string());
        }
    }

    let status = match Command::new(&real_7za)
        .args(&forward)
        // Never let 7za read from the inherited console. Extraction is
        // non-interactive; without `null` stdin a prompt (for example on a
        // pre-existing placeholder file) blocks the build forever.
        .stdin(Stdio::null())
        .status()
    {
        Ok(status) => status,
        Err(error) => {
            eprintln!("[7za-shim] failed to run {real_7za}: {error}");
            exit(1);
        }
    };

    let code = status.code().unwrap_or(1);

    // 7za exits with 2 when only symlink entries could not be created. The
    // Windows payload is already extracted, so treat that as success.
    if is_extract && code == 2 {
        exit(0);
    }

    exit(code);
}

/// Extract the `-o<dir>` output directory from a 7za command line.
fn parse_output_dir(args: &[String]) -> Option<PathBuf> {
    for arg in args {
        if let Some(rest) = arg.strip_prefix("-o") {
            if !rest.is_empty() {
                return Some(PathBuf::from(rest));
            }
        }
    }
    None
}

/// Create empty files where the bundle's symlinks would go so 7za can finish.
fn precreate_symlink_paths(output_dir: &Path) {
    for entry in KNOWN_SYMLINK_ENTRIES {
        let mut target = output_dir.to_path_buf();
        for segment in entry.split('/') {
            target.push(segment);
        }

        if let Some(parent) = target.parent() {
            let _ = fs::create_dir_all(parent);
        }
        if !target.exists() {
            let _ = File::create(&target);
        }
    }
}


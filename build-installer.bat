@echo off
setlocal
cd /d "%~dp0"

rem Windows installer distribution uses the production Mesa Code identity and stable artifact name.
set "MESA_CODE_ENV=production"
set "MESA_CODE_PREVIEW_IDENTITY=0"
set "MESA_CODE_SKIP_REMOTE_ASSETS=1"

rem ---------------------------------------------------------------------------
rem Step 1: verify the external build tools before doing anything expensive.
rem
rem electron-builder needs winCodeSign, nsis and nsis-resources. They are cached
rem under .tools\ and downloaded on demand. Checking first avoids bumping the
rem version and starting a multi-minute build only to fail on a missing tool.
rem ---------------------------------------------------------------------------
echo [1/3] Checking build tools...
call pnpm exec node scripts/tools/tool-bootstrap.mjs --check
if errorlevel 1 (
  echo.
  echo Build tools are missing. Downloading them now...
  call pnpm tools:bootstrap
  if errorlevel 1 (
    echo.
    echo ERROR: Could not prepare build tools. Check your network connection
    echo        and rerun this script.
    exit /b 1
  )
)

rem ---------------------------------------------------------------------------
rem Step 2: advance the installer version.
rem
rem This rewrites the root package.json. It runs only after the tools are known
rem to be available, so a failed tool download does not leave the version bumped.
rem ---------------------------------------------------------------------------
echo.
echo [2/3] Bumping installer version...
call pnpm exec node scripts/bump-desktop-version.mjs
if errorlevel 1 exit /b %errorlevel%

rem ---------------------------------------------------------------------------
rem Step 3: build the installer.
rem ---------------------------------------------------------------------------
echo.
echo [3/3] Building Windows x64 installer...
call pnpm bundle:desktop
if errorlevel 1 exit /b %errorlevel%

echo.
echo Installer ready:
dir /b /o-d packages\desktop\dist\MesaCode-*-win-x64.exe
endlocal

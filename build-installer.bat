@echo off
setlocal
cd /d "%~dp0"

rem Windows installer distribution uses the production Mesa Code identity and stable artifact name.
set "MESA_CODE_ENV=production"
set "MESA_CODE_PREVIEW_IDENTITY=0"
set "MESA_CODE_SKIP_REMOTE_ASSETS=1"

call pnpm exec node scripts/bump-desktop-version.mjs
if errorlevel 1 exit /b %errorlevel%

call pnpm bundle:desktop
if errorlevel 1 exit /b %errorlevel%

echo.
echo Installer ready:
dir /b /o-d packages\desktop\dist\MesaCode-*-win-x64.exe
endlocal

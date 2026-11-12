@echo off
if "%~1"=="" (
  echo Usage: render_all.bat ^<project_name^> [sfxOnly^|vo^|full]
  exit /b 1
)
set MIX=%~2
if "%MIX%"=="" set MIX=sfxOnly
node "%~dp0render_shots.js" "%~1" --mix %MIX% --merge
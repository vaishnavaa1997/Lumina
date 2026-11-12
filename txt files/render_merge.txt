@echo off
if "%~1"=="" (
  echo Usage: render_merge.bat ^<project_name^>
  exit /b 1
)
node "%~dp0render_shots.js" "%~1" -shot 999999 --merge
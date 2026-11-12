@echo off
if "%~2"=="" (
  echo Usage: render_one.bat ^<project_name^> ^<shot_number^> [sfxOnly^|vo^|full]
  exit /b 1
)
set MIX=%~3
if "%MIX%"=="" set MIX=sfxOnly
node "%~dp0render_shots.js" "%~1" -shot %~2 -mix %MIX%
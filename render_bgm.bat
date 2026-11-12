@echo off
if "%~1"=="" (
  echo Usage: render_bgm.bat ^<project_name^> [bgmOnly^|bgmFull]
  exit /b 1
)
set "MIXMODE=%~2"
if "%MIXMODE%"=="" set "MIXMODE=bgmOnly"
node "%~dp0render_bgm.js" "%~1" "%MIXMODE%"
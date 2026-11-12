@echo off
setlocal
if "%~2"=="" (
  echo Usage:
  echo   render_batch.bat ^<project_name^> ^<batch_file^> [sfxOnly^|vo^|full]
  echo   render_batch.bat ^<project_name^> ^<start_shot^> ^<end_shot^> [sfxOnly^|vo^|full]
  echo.
  echo Examples:
  echo   render_batch.bat gforce_island shots_01_06
  echo   render_batch.bat gforce_island 1 6
  exit /b 1
)

set "PROJECT=%~1"
set "ARG2=%~2"
set "ARG3=%~3"
set "ARG4=%~4"

if "%ARG3%"=="" goto :FILE_MODE
if /I "%ARG3%"=="vo" goto :FILE_MODE
if /I "%ARG3%"=="sfxOnly" goto :FILE_MODE
if /I "%ARG3%"=="full" goto :FILE_MODE

:RANGE_MODE
set /a "START_SHOT=%ARG2%"
set /a "END_SHOT=%ARG3%"
set "MIX=%ARG4%"
if "%MIX%"=="" set "MIX=sfxOnly"
for /L %%S in (%START_SHOT%,1,%END_SHOT%) do (
  node "%~dp0render_shots.js" "%PROJECT%" -shot %%S -mix %MIX%
)
goto :EOF

:FILE_MODE
set "MIX=%ARG3%"
if "%MIX%"=="" set "MIX=sfxOnly"
node "%~dp0render_shots.js" "%PROJECT%" -batch "%ARG2%" -mix %MIX%
endlocal
@echo off
rem Starts the game on http://localhost:8080 (needs Node.js or Python 3)
cd /d "%~dp0"
start "" http://localhost:8080
where node >nul 2>nul && (node tools\serve.js 8080 & goto :eof)
where py >nul 2>nul && (py -3 -m http.server 8080 & goto :eof)
where python >nul 2>nul && (python -m http.server 8080 & goto :eof)
echo Node.js or Python 3 is required to run the game locally.
pause

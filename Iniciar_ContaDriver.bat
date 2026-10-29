@echo off
title ContaDriver DiDi - Control Contable
cd /d "%~dp0"
echo ============================================================
echo   Iniciando ContaDriver DiDi...
echo ============================================================
python app.py
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo No se pudo ejecutar con Python. Abriendo directamente index.html...
    start index.html
)
pause

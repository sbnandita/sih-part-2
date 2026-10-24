@echo off
title Push APAAR Verify to GitHub (sbnandita/sih-part-2)
echo ========================================================
echo   Pushing APAAR Verify to sbnandita/sih-part-2
echo ========================================================
echo.
cd /d "C:\Users\Dell\.gemini\antigravity\scratch\apaar-verify"
git push -u origin main
echo.
if %ERRORLEVEL% EQU 0 (
    echo [SUCCESS] Pushed successfully to https://github.com/sbnandita/sih-part-2
) else (
    echo [ERROR] Push failed. If authentication failed, please ensure you sign in to GitHub in the browser window.
)
echo.
pause

@echo off
chcp 65001 >nul
cd /d "%~dp0.."
where git >nul 2>nul || (echo Chua cai Git. Tai tai: https://git-scm.com/download/win & pause & exit /b 1)
if not exist .git git init
git branch -M main
set /p URL=Dan link repo GitHub (vd https://github.com/ten-ban/dai-doan-ket.git): 
git remote remove origin >nul 2>nul
git remote add origin %URL%
git add -A
git commit -m "Cap nhat game Dai Doan Ket"
git push -u origin main
echo.
echo Xong! Neu bao loi dang nhap, hay dang nhap GitHub trong cua so hien ra.
pause

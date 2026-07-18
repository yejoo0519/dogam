@echo off
rem push _split\frames1-4 to dogam-frames1-4

cd /d "%~dp0"

for /L %%N in (1,1,4) do (
  echo.
  echo ===== dogam-frames%%N push start =====
  cd _split\frames%%N
  git init
  git branch -M main
  git remote remove origin 2>nul
  git remote add origin https://github.com/yejoo0519/dogam-frames%%N.git
  git add .
  git commit -m "dragon frames"
  git push -u origin main
  cd ..\..
)

echo.
echo ===== ALL DONE =====
pause

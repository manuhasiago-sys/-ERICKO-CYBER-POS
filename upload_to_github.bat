@echo off
echo ========================================================
echo ERICKO-CYBER-POS GITHUB UPLOADER
echo ========================================================
echo.

echo Setting up Git Identity...
git config --global user.email "manuhasiago@gmail.com"
git config --global user.name "manuhasiago-sys"

echo.
echo Initializing Git repository...
git init

echo Adding files...
git add .

echo Committing files...
git commit -m "Initial commit with POS functionality and local storage fixes"

echo Setting main branch...
git branch -M main

echo Cleaning up old connections...
git remote remove origin 2>nul

echo Connecting to GitHub (https://github.com/manuhasiago-sys/ERICKO-CYBER-POS.git)...
git remote add origin https://github.com/manuhasiago-sys/ERICKO-CYBER-POS.git

echo Pushing code to GitHub...
git push -u origin main

echo.
echo ========================================================
echo Upload complete! Check your GitHub repository.
echo ========================================================
pause

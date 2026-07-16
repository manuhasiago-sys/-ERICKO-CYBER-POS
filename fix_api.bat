@echo off
echo Copying new API files to XAMPP...
copy /Y "%~dp0api\categories.php" "C:\xampp\htdocs\Ericko-Enterprise-POS-main\api\categories.php"
echo Done! Categories should now work perfectly.
pause

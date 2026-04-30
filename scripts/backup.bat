@echo off
set BACKUP_DIR=D:\New Z\Angular\kasirku\Backup Database

REM Ambil tanggal dan waktu dengan cara yang lebih reliable
for /f "tokens=2 delims==" %%a in ('wmic os get localdatetime /value') do set DT=%%a
set YEAR=%DT:~0,4%
set MONTH=%DT:~4,2%
set DAY=%DT:~6,2%
set HOUR=%DT:~8,2%
set MIN=%DT:~10,2%

set FOLDER=%BACKUP_DIR%\backup-%YEAR%-%MONTH%-%DAY%_%HOUR%-%MIN%

mkdir "%FOLDER%"

"C:\Program Files\MongoDB\Tools\100\bin\mongodump.exe" --db kasirku --out "%FOLDER%"

echo Backup selesai: %FOLDER%

REM Hapus backup lebih dari 7 hari
forfiles /p "%BACKUP_DIR%" /d -7 /c "cmd /c rmdir /s /q @path" 2>nul

echo Done.
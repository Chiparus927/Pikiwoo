@echo off
cd /d "%~dp0"
echo === PikiWO - pornire server + MySQL Workbench ===
where npm >nul 2>&1
if errorlevel 1 (
    echo.
    echo EROARE: Node.js nu este instalat.
    echo Descarca de la https://nodejs.org si reinstaleaza, apoi ruleaza din nou acest fisier.
    echo.
    pause
    exit /b 1
)
if not exist .env (
    echo MYSQL_HOST=localhost>.env
    echo MYSQL_PORT=3306>>.env
    echo MYSQL_USER=root>>.env
    echo MYSQL_PASSWORD=4frati2008>>.env
    echo MYSQL_DATABASE=Pikowoo>>.env
)
if not exist node_modules (
    echo Instalare pachete...
    call npm install
)
if not exist seed\products.json (
    echo Export produse...
    call npm run export-products
)
echo Creare/verificare tabele MySQL...
call npm run init-db
echo.
echo Deschide in browser: http://localhost:3000
echo.
call npm start
pause

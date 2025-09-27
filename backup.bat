@echo off
echo Creando backup del proyecto gestor-proyectos...

REM Crear directorio de backup con timestamp
for /f "tokens=2 delims==" %%a in ('wmic OS Get localdatetime /value') do set "dt=%%a"
set "YY=%dt:~2,2%" & set "YYYY=%dt:~0,4%" & set "MM=%dt:~4,2%" & set "DD=%dt:~6,2%"
set "HH=%dt:~8,2%" & set "Min=%dt:~10,2%" & set "Sec=%dt:~12,2%"
set "timestamp=%YYYY%-%MM%-%DD%_%HH%-%Min%-%Sec%"

set "backup_dir=backup_gestor-proyectos_%timestamp%"

REM Crear directorio de backup
mkdir "%backup_dir%"

echo Copiando archivos del proyecto...

REM Copiar archivos principales del proyecto
xcopy "src" "%backup_dir%\src" /E /I /H /Y
xcopy "public" "%backup_dir%\public" /E /I /H /Y
copy "package.json" "%backup_dir%\"
copy "package-lock.json" "%backup_dir%\" 2>nul
copy "pnpm-lock.yaml" "%backup_dir%\"
copy "tsconfig.json" "%backup_dir%\"
copy "next.config.ts" "%backup_dir%\"
copy "tailwind.config.mjs" "%backup_dir%\"
copy "postcss.config.mjs" "%backup_dir%\"
copy "eslint.config.mjs" "%backup_dir%\"
copy "components.json" "%backup_dir%\"
copy "next-env.d.ts" "%backup_dir%\"
copy "README.md" "%backup_dir%\"
copy "supabase-gantt-schema.sql" "%backup_dir%\"
copy "temp_proyectos.txt" "%backup_dir%\" 2>nul

REM Crear archivo .gitignore para el backup
echo node_modules/ > "%backup_dir%\.gitignore"
echo .next/ >> "%backup_dir%\.gitignore"
echo .env.local >> "%backup_dir%\.gitignore"
echo .env >> "%backup_dir%\.gitignore"
echo .vercel >> "%backup_dir%\.gitignore"

echo.
echo Backup completado exitosamente!
echo Directorio de backup: %backup_dir%
echo.
echo Archivos incluidos:
echo - Código fuente (src/)
echo - Archivos públicos (public/)
echo - Archivos de configuración
echo - Dependencias (package.json, pnpm-lock.yaml)
echo - Documentación (README.md)
echo.
echo Archivos excluidos:
echo - node_modules/
echo - .next/
echo - Archivos temporales
echo.
pause

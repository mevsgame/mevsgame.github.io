@echo off
:: setup-hooks.bat

:: Create hooks directory if it doesn't exist
if not exist ".git\hooks" mkdir ".git\hooks"

:: Copy all hooks
for %%f in (.github\hooks\*) do (
    echo "%%f"
    copy "%%f" ".git\hooks\" /Y
)

echo Hooks setup complete!
pause
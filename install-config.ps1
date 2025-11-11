$appDataPath = [Environment]::GetFolderPath("LocalApplicationData")
$vegaSdkConfigPath = Join-Path $appDataPath "VEGA_SDK\configs"

# 確保 VEGA_SDK 目錄存在
if (-not (Test-Path $vegaSdkConfigPath)) {
    New-Item -Path $vegaSdkConfigPath -ItemType Directory
}

# 複製設定檔案到 VEGA_SDK 目錄
Copy-Item -Path ".\configs\*" -Destination $vegaSdkConfigPath -Force

Write-Host "Configuration files copied to $vegaSdkConfigPath"
Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

# Prepara esta PC Windows para correr Lanza 24/7. Ejecutar UNA vez, como Administrador:
#   clic derecho en PowerShell > "Ejecutar como administrador", luego:
#   cd <carpeta deploy\local>; powershell -ExecutionPolicy Bypass -File .\preparar-windows.ps1
# Hace 4 cosas (ninguna toca tus datos):
#   1) limita WSL/Docker a 6 GB de RAM (.wslconfig)
#   2) evita que la PC se duerma o hiberne mientras esta enchufada
#   3) crea .env con claves aleatorias (sin mostrarlas) si todavia no existe
#   4) crea la tarea "Lanza-Arranque" que levanta Lanza al iniciar sesion en Windows

$ErrorActionPreference = 'Stop'
$aqui = Split-Path -Parent $MyInvocation.MyCommand.Path

# 1) Limite de memoria de WSL2 (Docker Desktop lo usa)
$wslcfg = Join-Path $env:USERPROFILE '.wslconfig'
if (Test-Path $wslcfg) {
    Write-Host "Ya existe $wslcfg. Revisa que tenga [wsl2] memory=6GB (no lo modifico)."
} else {
    Set-Content -Path $wslcfg -Value "[wsl2]`nmemory=6GB`nswap=2GB" -Encoding ASCII
    Write-Host "Creado $wslcfg con memory=6GB."
}

# 2) Sin suspension ni hibernacion con corriente
powercfg /change standby-timeout-ac 0
powercfg /change hibernate-timeout-ac 0
Write-Host "Suspension e hibernacion desactivadas (con corriente)."

# 3) .env con secretos aleatorios
$envFile = Join-Path $aqui '.env'
if (-not (Test-Path $envFile)) {
    function Nuevo-Secreto { $b = New-Object byte[] 32; [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($b); [Convert]::ToBase64String($b) -replace '[+/=]', 'x' }
    $txt = Get-Content (Join-Path $aqui '.env.example') -Raw
    foreach ($k in 'JWT_SECRET', 'POSTGRES_PASSWORD', 'TEMPORAL_DB_PASSWORD') {
        $txt = $txt -replace "(?m)^$k=\s*$", "$k=$(Nuevo-Secreto)"
    }
    # ENCRYPTION_KEY debe ser base64 de EXACTAMENTE 32 bytes (con su '=' final)
    $kb = New-Object byte[] 32; [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($kb)
    $txt = $txt -replace '(?m)^ENCRYPTION_KEY=\s*$', ('ENCRYPTION_KEY=' + [Convert]::ToBase64String($kb))
    Set-Content -Path $envFile -Value $txt -Encoding ASCII
    Write-Host "Creado .env con 4 claves aleatorias. Falta llenar el token del tunel y R2 (ver PENDIENTES_SANTIAGO.md)."
    Write-Host "IMPORTANTE: guarda una copia de ENCRYPTION_KEY en tu gestor de claves."
} else {
    Write-Host ".env ya existe; no lo toco."
}

# 4) Tarea de arranque: espera a Docker y corre 'docker compose up -d'
$accion = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-NoProfile -WindowStyle Hidden -Command `"`$t=0; while(`$t -lt 60){ docker info *> `$null; if(`$LASTEXITCODE -eq 0){break}; Start-Sleep 10; `$t++ }; docker compose -f '$aqui\docker-compose.yml' --env-file '$aqui\.env' up -d`""
$disparador = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
$ajustes = New-ScheduledTaskSettingsSet -StartWhenAvailable -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 2)
Register-ScheduledTask -TaskName 'Lanza-Arranque' -Action $accion -Trigger $disparador -Settings $ajustes -Force | Out-Null
Write-Host "Tarea 'Lanza-Arranque' creada (se ejecuta al iniciar sesion)."

Write-Host ""
Write-Host "Falta (manual, ver PENDIENTES_SANTIAGO.md): inicio de sesion automatico de Windows y 'Start Docker Desktop when you sign in'."


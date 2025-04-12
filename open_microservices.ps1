# Script para abrir os microserviços HubEscolar em abas do Terminal do Windows (via linha de comando - tentativa mais robusta)

# Tenta encontrar o executável do Terminal do Windows
$TerminalExecutable = Get-Command WindowsTerminal.exe -ErrorAction SilentlyContinue

if ($TerminalExecutable) {
    Write-Host "Terminal do Windows encontrado em: $($TerminalExecutable.Source)"

    # Array com os comandos para cada serviço
    $ServiceCommands = @(
        @{ "Path" = "D:\Documents\GitHub\hubescolar\services\auth-service"; "Command" = "npm start" },
        @{ "Path" = "D:\Documents\GitHub\hubescolar\services\district-service"; "Command" = "npm start" },
        @{ "Path" = "D:\Documents\GitHub\hubescolar\services\school-service"; "Command" = "npm start" },
        @{ "Path" = "D:\Documents\GitHub\hubescolar\services\users-service"; "Command" = "npm start" }
    )

    # Abre o Terminal do Windows (se não estiver aberto)
    Start-Process -FilePath $TerminalExecutable.Source

    # Espera um pouco para o Terminal abrir
    Start-Sleep -Seconds 2

    # Loop através dos comandos dos serviços e abre cada um em uma nova aba
    foreach ($Service in $ServiceCommands) {
        $Arguments = "new-tab", "-d", "'$($Service.Path)'", "-c", "'$($Service.Command)'"
        Start-Process -FilePath $TerminalExecutable.Source -ArgumentList $Arguments
        Start-Sleep -Milliseconds 500 # Pequena pausa entre a abertura das abas
    }
    Write-Host "Processo de inicialização dos microserviços iniciado em abas do Terminal do Windows."
    Write-Host "Verifique a janela do Terminal do Windows para acompanhar o status de inicialização."
} else {
    Write-Host "O Terminal do Windows não foi encontrado. Execute o script padrão para abrir em janelas separadas."
    # (Código para abrir em janelas separadas - como antes)
    $PowerShellPath = "C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe"
    $ServicePaths = @(
        "D:\Documents\GitHub\hubescolar\services\auth-service",
        "D:\Documents\GitHub\hubescolar\services\district-service",
        "D:\Documents\GitHub\hubescolar\services\school-service",
        "D:\Documents\GitHub\hubescolar\services\users-service"
    )
    foreach ($Path in $ServicePaths) {
        Start-Process -FilePath $PowerShellPath -ArgumentList "-NoExit", "-Command", "cd '$Path'; npm start" -WorkingDirectory $Path
    }
    Write-Host "Processo de inicialização dos microserviços iniciado em janelas separadas do PowerShell."
    Write-Host "Verifique cada janela para acompanhar o status de inicialização."
}
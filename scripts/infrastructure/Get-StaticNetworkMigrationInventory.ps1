#Requires -Version 5.1
<# Read-only inventory. No switches, ACLs, NATs, routes or services are changed. #>
[CmdletBinding()]
param([string]$VMName = 'Mercurion-Server')
$ErrorActionPreference = 'Stop'
$taskSections = [ordered]@{}

function Read-MigrationSection {
    param([string]$Name, [scriptblock]$Read)
    try {
        $taskSections[$Name] = [ordered]@{ status = 'observed'; data = @(& $Read) }
    } catch {
        $taskSections[$Name] = [ordered]@{
            status = 'unavailable'
            errorId = $_.FullyQualifiedErrorId
        }
    }
}

Read-MigrationSection 'vm' {
    Get-VM -Name $VMName | Select-Object Name, @{n='State';e={[string]$_.State}}
}
Read-MigrationSection 'vmAdapters' {
    Get-VMNetworkAdapter -VMName $VMName |
        Select-Object VMName, Name, Id, SwitchName, MacAddress, IPAddresses
}
Read-MigrationSection 'switches' {
    Get-VMSwitch | Select-Object Name, Id, @{n='SwitchType';e={[string]$_.SwitchType}}, NetAdapterInterfaceDescription
}
Read-MigrationSection 'simpleAcls' {
    Get-VMNetworkAdapterAcl -VMName $VMName | Select-Object VMNetworkAdapterName,
        @{n='Direction';e={[string]$_.Direction}}, @{n='Action';e={[string]$_.Action}}, LocalAddress, RemoteAddress
}
Read-MigrationSection 'extendedAcls' {
    Get-VMNetworkAdapterExtendedAcl -VMName $VMName | Select-Object VMNetworkAdapterName,
        @{n='Direction';e={[string]$_.Direction}}, @{n='Action';e={[string]$_.Action}},
        LocalIPAddress, RemoteIPAddress, LocalPort, RemotePort, Protocol, Weight, Stateful, IdleSessionTimeout
}
Read-MigrationSection 'nat' {
    Get-NetNat | Select-Object Name, InternalIPInterfaceAddressPrefix, Active
}
Read-MigrationSection 'natStaticMappings' {
    Get-NetNatStaticMapping | Select-Object NatName, Protocol, ExternalIPAddress, ExternalPort, InternalIPAddress, InternalPort
}
Read-MigrationSection 'hnsNetworks' {
    Get-HnsNetwork | ForEach-Object {
        [pscustomobject]@{
            Name = $_.Name; Id = $_.Id; Type = $_.Type
            Subnets = @($_.Subnets | Select-Object AddressPrefix, GatewayAddress)
        }
    }
}
Read-MigrationSection 'addresses' {
    Get-NetIPAddress | Select-Object InterfaceAlias, InterfaceIndex, IPAddress, PrefixLength,
        @{n='AddressFamily';e={[string]$_.AddressFamily}}
}
Read-MigrationSection 'routes' {
    Get-NetRoute | Select-Object InterfaceAlias, InterfaceIndex, DestinationPrefix, NextHop, RouteMetric
}
Read-MigrationSection 'connectionProfiles' {
    Get-NetConnectionProfile | Select-Object InterfaceAlias, InterfaceIndex,
        @{n='NetworkCategory';e={[string]$_.NetworkCategory}}
}
Read-MigrationSection 'ipInterfaces' {
    Get-NetIPInterface | Select-Object InterfaceAlias,
        @{n='AddressFamily';e={[string]$_.AddressFamily}},
        @{n='Forwarding';e={[string]$_.Forwarding}},
        @{n='WeakHostSend';e={[string]$_.WeakHostSend}},
        @{n='WeakHostReceive';e={[string]$_.WeakHostReceive}}
}
Read-MigrationSection 'hostAdapters' {
    Get-NetAdapter | Select-Object Name, InterfaceDescription, Status, MacAddress
}
Read-MigrationSection 'networkServices' {
    Get-Service -Name hns, vmms, SharedAccess, WslService, RemoteAccess -ErrorAction SilentlyContinue |
        Select-Object Name, @{n='Status';e={[string]$_.Status}}
}
Read-MigrationSection 'dockerDesktopNetworks' {
    $taskDocker = (Get-Command docker.exe -CommandType Application -ErrorAction Stop | Select-Object -First 1).Source
    $taskEndpoint = & $taskDocker context inspect desktop-linux --format '{{.Endpoints.docker.Host}}'
    if ($LASTEXITCODE -ne 0 -or $taskEndpoint -notmatch '^npipe://') { throw 'LocalDockerContextRequired' }
    $taskNetworks = @(& $taskDocker --context desktop-linux network ls --format '{{.ID}}')
    if ($LASTEXITCODE -ne 0) { throw 'DockerNetworkListFailed' }
    foreach ($taskNetwork in $taskNetworks) {
        $taskJson = & $taskDocker --context desktop-linux network inspect $taskNetwork --format '{{json .}}'
        if ($LASTEXITCODE -ne 0) { throw 'DockerNetworkInspectFailed' }
        $taskParsed = $taskJson | ConvertFrom-Json
        [pscustomobject]@{
            Name = $taskParsed.Name
            Driver = $taskParsed.Driver
            IPAM = @($taskParsed.IPAM.Config | Select-Object Subnet, Gateway)
        }
    }
}

$taskIncomplete = @($taskSections.Values | Where-Object { $_.status -ne 'observed' }).Count -gt 0
$taskReport = [ordered]@{
    schemaVersion = 1
    observedAtUtc = [datetime]::UtcNow.ToString('o')
    scope = 'static-network-migration-inventory-only'
    vmName = $VMName
    incomplete = $taskIncomplete
    migrationReady = $false
    isolationAccepted = $false
    sections = $taskSections
}
$taskArtifactBase = Join-Path ([Environment]::GetFolderPath('UserProfile')) '.codex/artifacts/inf-vm-02/static-network'
$taskRunDirectory = Join-Path $taskArtifactBase ([Guid]::NewGuid().ToString('N'))
[void][IO.Directory]::CreateDirectory($taskRunDirectory)
$taskReportPath = Join-Path $taskRunDirectory 'inventory.json'
$taskReport | ConvertTo-Json -Depth 12 | Set-Content -Encoding UTF8 -LiteralPath $taskReportPath
[ordered]@{
    reportPath = $taskReportPath
    incomplete = $taskIncomplete
    unavailableSections = @($taskSections.Keys | Where-Object { $taskSections[$_].status -ne 'observed' })
    migrationReady = $false
    isolationAccepted = $false
} | ConvertTo-Json -Depth 4
if ($taskIncomplete) { exit 2 }

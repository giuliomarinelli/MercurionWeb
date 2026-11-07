#Requires -Version 5.1
<#
.SYNOPSIS
Inventario locale in sola lettura per INF-VM-02; JSON su stdout.
.DESCRIPTION
Non avvia VM, non cambia switch/firewall e non legge credenziali.
Exit 2 indica inventario incompleto, non assenza della VM o isolamento provato.
Eseguire da una shell amministrativa per le sezioni Hyper-V, se autorizzati.
#>
[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$taskSections = [ordered]@{}

function Read-InventorySection {
    param([string]$Name, [scriptblock]$Read)
    try {
        $taskSections[$Name] = [ordered]@{ status = 'observed'; data = @(& $Read) }
    } catch {
        # Non serializzare messaggi arbitrari o l'intero oggetto d'errore.
        $taskSections[$Name] = [ordered]@{
            status = 'unavailable'
            errorType = $_.Exception.GetType().Name
            errorId = $_.FullyQualifiedErrorId
        }
    }
}

Read-InventorySection 'operatingSystem' {
    Get-CimInstance Win32_OperatingSystem | Select-Object Caption, Version, BuildNumber
}
Read-InventorySection 'resources' {
    Get-CimInstance Win32_ComputerSystem |
        Select-Object HypervisorPresent, NumberOfLogicalProcessors,
            @{ Name = 'MemoryGiB'; Expression = { [math]::Round($_.TotalPhysicalMemory / 1GB, 2) } }
}
Read-InventorySection 'virtualMachines' {
    Get-VM | Select-Object Name, @{ Name = 'State'; Expression = { [string]$_.State } }, Generation, ProcessorCount, MemoryStartup, DynamicMemoryEnabled
}
Read-InventorySection 'virtualSwitches' {
    Get-VMSwitch | Select-Object Name, @{ Name = 'SwitchType'; Expression = { [string]$_.SwitchType } }
}
Read-InventorySection 'virtualAdapters' {
    Get-VM | Get-VMNetworkAdapter | Select-Object VMName, SwitchName, IPAddresses
}
Read-InventorySection 'adapterAcls' {
    Get-VM | ForEach-Object {
        $taskVm = $_
        Get-VMNetworkAdapterAcl -VMName $taskVm.Name | Select-Object @{ Name = 'VMName'; Expression = { $taskVm.Name } },
            @{ Name = 'Direction'; Expression = { [string]$_.Direction } },
            @{ Name = 'Action'; Expression = { [string]$_.Action } },
            LocalAddress, RemoteAddress,
            @{ Name = 'LocalAddressType'; Expression = { [string]$_.LocalAddressType } },
            @{ Name = 'RemoteAddressType'; Expression = { [string]$_.RemoteAddressType } }
    }
}
Read-InventorySection 'adapterExtendedAcls' {
    Get-VM | ForEach-Object {
        $taskVm = $_
        Get-VMNetworkAdapterExtendedAcl -VMName $taskVm.Name | Select-Object @{ Name = 'VMName'; Expression = { $taskVm.Name } },
            @{ Name = 'Direction'; Expression = { [string]$_.Direction } },
            @{ Name = 'Action'; Expression = { [string]$_.Action } },
            LocalIPAddress, RemoteIPAddress, LocalPort, RemotePort, Protocol,
            Weight, Stateful, IdleSessionTimeout
    }
}
Read-InventorySection 'natInventory' {
    Get-NetNat | Select-Object Name, InternalIPInterfaceAddressPrefix, Active
}
Read-InventorySection 'addresses' {
    Get-NetIPAddress | Select-Object InterfaceAlias, IPAddress, PrefixLength,
        @{ Name = 'Family'; Expression = { $_.AddressFamily.ToString() } }
}
Read-InventorySection 'routes' {
    Get-NetRoute | Select-Object InterfaceAlias, DestinationPrefix, NextHop, RouteMetric
}
Read-InventorySection 'connectionProfiles' {
    Get-NetConnectionProfile | Select-Object InterfaceAlias,
        @{ Name = 'Category'; Expression = { $_.NetworkCategory.ToString() } }
}
Read-InventorySection 'firewallProfiles' {
    Get-NetFirewallProfile -PolicyStore ActiveStore | Select-Object Name, Enabled,
        @{ Name = 'Inbound'; Expression = { $_.DefaultInboundAction.ToString() } },
        @{ Name = 'Outbound'; Expression = { $_.DefaultOutboundAction.ToString() } }
}
Read-InventorySection 'firewallProducts' {
    Get-CimInstance -Namespace root/SecurityCenter2 -ClassName FirewallProduct | Select-Object displayName
}

$taskIncomplete = @($taskSections.Values | Where-Object { $_.status -ne 'observed' }).Count -gt 0
[ordered]@{
    schemaVersion = 2
    observedAtUtc = [datetime]::UtcNow.ToString('o')
    scope = 'windows-host-only'
    status = $(if ($taskIncomplete) { 'partial' } else { 'observed' })
    isolationAccepted = $false
    sections = $taskSections
} | ConvertTo-Json -Depth 8
if ($taskIncomplete) { exit 2 }

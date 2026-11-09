#Requires -Version 5.1
# Library: only Invoke-MercurionVmAcl performs native reads/writes. No import-time I/O.

function Get-MercurionSshOnlyRules {
    $taskRules = @()
    foreach ($taskDirection in @('Inbound', 'Outbound')) {
        $taskRules += [pscustomobject]@{ Action='Deny'; Direction=$taskDirection; Weight=10 }
        $taskRules += [pscustomobject]@{ Action='Deny'; Direction=$taskDirection; Weight=900; RemoteIPAddress='::/0' }
    }
    $taskRules += [pscustomobject]@{
        Action='Allow'; Direction='Inbound'; Weight=300
        LocalIPAddress='10.203.240.10/32'; RemoteIPAddress='10.203.240.1/32'
        Protocol='TCP'; LocalPort='22'; Stateful=$true; IdleSessionTimeout=3600
    }
    $taskWeight = 201
    foreach ($taskPrefix in @('10.0.0.0/8','172.16.0.0/12','192.168.0.0/16',
            '127.0.0.0/8','169.254.0.0/16','100.64.0.0/10','0.0.0.0/8','224.0.0.0/4','240.0.0.0/4')) {
        $taskRules += [pscustomobject]@{
            Action='Deny'; Direction='Outbound'; Weight=$taskWeight; RemoteIPAddress=$taskPrefix
        }
        $taskWeight++
    }
    return $taskRules
}

function Get-MercurionGuardRules {
    foreach ($taskDirection in @('Inbound','Outbound')) {
        [pscustomobject]@{ Action='Deny'; Direction=$taskDirection; Weight=10000 }
    }
}

function ConvertTo-MercurionAclSignature {
    param([Parameter(Mandatory=$true)]$Rule)
    $taskParts = @()
    foreach ($taskField in @('Action','Direction','LocalIPAddress','RemoteIPAddress','LocalPort','RemotePort','Protocol')) {
        $taskValue = [string]$Rule.$taskField
        if ([string]::IsNullOrWhiteSpace($taskValue)) { $taskValue = 'ANY' }
        if ($taskField -in @('LocalIPAddress','RemoteIPAddress') -and $taskValue -ne 'ANY' -and -not $taskValue.Contains('/')) {
            $taskAddress = $null
            if ([Net.IPAddress]::TryParse($taskValue, [ref]$taskAddress)) {
                $taskValue += $(if ($taskAddress.AddressFamily -eq [Net.Sockets.AddressFamily]::InterNetwork) { '/32' } else { '/128' })
            }
        }
        $taskParts += $taskValue.ToUpperInvariant()
    }
    $taskParts += [string][int]$Rule.Weight
    $taskParts += [string][bool]$Rule.Stateful
    $taskParts += [string][int]$Rule.IdleSessionTimeout
    return $taskParts -join '|'
}

function Test-MercurionAclRules {
    param([object[]]$Actual, [object[]]$Expected)
    $taskActual = @($Actual | ForEach-Object { ConvertTo-MercurionAclSignature $_ } | Sort-Object)
    $taskExpected = @($Expected | ForEach-Object { ConvertTo-MercurionAclSignature $_ } | Sort-Object)
    return ($taskActual.Count -eq $taskExpected.Count -and ($taskActual -join "`n") -ceq ($taskExpected -join "`n"))
}

function Get-MercurionVmAclContext {
    $taskVm = Get-VM -Name 'Mercurion-Server' -ErrorAction Stop
    $taskAdapters = @(Get-VMNetworkAdapter -VMName 'Mercurion-Server' -ErrorAction Stop)
    if ($taskAdapters.Count -ne 1 -or $taskAdapters[0].MacAddress -ne '00155D00DD01') {
        throw 'Identita vNIC inattesa: nessuna modifica consentita.'
    }
    $taskNic = $taskAdapters[0]
    if ($taskNic.SwitchName -notin @('Default Switch','Mercurion-Internal','')) {
        throw 'Switch della vNIC inatteso: nessuna modifica consentita.'
    }
    [pscustomobject]@{
        Vm = $taskVm; Nic = $taskNic
        Simple = @(Get-VMNetworkAdapterAcl -VMNetworkAdapter $taskNic -ErrorAction Stop)
        Extended = @(Get-VMNetworkAdapterExtendedAcl -VMNetworkAdapter $taskNic -ErrorAction Stop)
    }
}

function Assert-MercurionVmOff {
    if ([string](Get-VM -Name 'Mercurion-Server' -ErrorAction Stop).State -ne 'Off') {
        throw 'La VM deve essere Spenta. Non viene arrestata automaticamente.'
    }
}

function Save-MercurionAclSnapshot {
    param($Context)
    $taskBase = Join-Path ([Environment]::GetFolderPath('UserProfile')) '.codex/artifacts/inf-vm-02/static-network/acl'
    $taskDirectory = Join-Path $taskBase ([Guid]::NewGuid().ToString('N'))
    [void][IO.Directory]::CreateDirectory($taskDirectory)
    $taskFile = Join-Path $taskDirectory 'before.json'
    [ordered]@{
        schemaVersion=1; observedAtUtc=[datetime]::UtcNow.ToString('o')
        vmName='Mercurion-Server'; adapterId=[string]$Context.Nic.Id
        adapterName=[string]$Context.Nic.Name; macAddress=[string]$Context.Nic.MacAddress
        switchName=[string]$Context.Nic.SwitchName
        simple=@($Context.Simple | Select-Object @{n='Action';e={[string]$_.Action}},@{n='Direction';e={[string]$_.Direction}},LocalAddress,RemoteAddress,LocalMacAddress,RemoteMacAddress)
        extended=@($Context.Extended | Select-Object @{n='Action';e={[string]$_.Action}},@{n='Direction';e={[string]$_.Direction}},LocalIPAddress,RemoteIPAddress,LocalPort,RemotePort,Protocol,Weight,Stateful,IdleSessionTimeout)
    } | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $taskFile -Encoding UTF8 -ErrorAction Stop
    if (-not (Test-Path -LiteralPath $taskFile -PathType Leaf)) { throw 'Snapshot ACL non salvato.' }
    return $taskFile
}

function Add-MercurionAclRule {
    param($Nic, $Rule)
    Assert-MercurionVmOff
    $taskParameters = @{ VMNetworkAdapter=$Nic; ErrorAction='Stop' }
    foreach ($taskProperty in $Rule.PSObject.Properties) { $taskParameters[$taskProperty.Name] = $taskProperty.Value }
    Add-VMNetworkAdapterExtendedAcl @taskParameters
}

function Invoke-MercurionVmAcl {
    param([ValidateSet('Plan','Apply','Verify','Quarantine')][string]$Mode='Plan')
    $taskContext = Get-MercurionVmAclContext
    $taskExpected = @(Get-MercurionSshOnlyRules)
    $taskGuards = @(Get-MercurionGuardRules)
    $taskMatches = $taskContext.Simple.Count -eq 0 -and (Test-MercurionAclRules $taskContext.Extended $taskExpected)
    if ($Mode -eq 'Plan') {
        return [ordered]@{
            mode='Plan'; vmName='Mercurion-Server'; vmState=[string]$taskContext.Vm.State
            adapterName=[string]$taskContext.Nic.Name; macAddress=[string]$taskContext.Nic.MacAddress
            switchName=[string]$taskContext.Nic.SwitchName
            currentSimpleCount=$taskContext.Simple.Count; currentExtendedCount=$taskContext.Extended.Count
            expectedRules=$taskExpected; policyMatches=$taskMatches
            internetEgressEnabled=$false; isolationAccepted=$false; mutationsPerformed=$false
        }
    }
    if ($Mode -eq 'Verify') {
        if (-not $taskMatches) { throw 'Le ACL lette non corrispondono alla policy SSH-only.' }
        return [ordered]@{ mode='Verify'; settingsReadbackVerified=$true; internetEgressEnabled=$false; isolationAccepted=$false }
    }
    Assert-MercurionVmOff
    if (@($taskContext.Extended | Where-Object Weight -gt 10000).Count -gt 0) {
        throw 'Regola sopra la priorita delle guardie: nessuna modifica consentita.'
    }
    if ($Mode -eq 'Apply') {
        $taskSwitch = Get-VMSwitch -Name 'Mercurion-Internal' -ErrorAction Stop
        if ([string]$taskSwitch.SwitchType -ne 'Internal') { throw 'Il nuovo switch deve essere Internal.' }
        $taskAddress = @(Get-NetIPAddress -InterfaceAlias 'vEthernet (Mercurion-Internal)' -AddressFamily IPv4 -PolicyStore ActiveStore -ErrorAction Stop |
            Where-Object { $_.IPAddress -eq '10.203.240.1' -and $_.PrefixLength -eq 24 -and [string]$_.AddressState -eq 'Preferred' })
        if ($taskAddress.Count -ne 1) { throw 'IP host statico Preferred non verificato.' }
        if ($taskMatches) {
            return [ordered]@{ mode='Apply'; alreadyConfigured=$true; mutationsPerformed=$false; isolationAccepted=$false }
        }
        if (@($taskContext.Extended | Where-Object Weight -ge 10000).Count -gt 0) {
            throw 'Guardia o regola prioritaria presente: diagnosticare prima di riprovare.'
        }
    }
    # No writes at all if the original snapshot cannot be saved.
    $taskSnapshot = Save-MercurionAclSnapshot $taskContext
    Write-Host ('Snapshot ACL: ' + $taskSnapshot)
    foreach ($taskGuard in $taskGuards) {
        $taskExisting = @($taskContext.Extended | Where-Object {
            $_.Weight -eq 10000 -and [string]$_.Direction -eq $taskGuard.Direction
        })
        if ($taskExisting.Count -gt 0) {
            if (-not (Test-MercurionAclRules $taskExisting @($taskGuard))) { throw 'Guardia preesistente inattesa.' }
        } else { Add-MercurionAclRule $taskContext.Nic $taskGuard }
    }
    $taskRead = @(Get-VMNetworkAdapterExtendedAcl -VMNetworkAdapter $taskContext.Nic -ErrorAction Stop)
    if (-not (Test-MercurionAclRules @($taskRead | Where-Object Weight -eq 10000) $taskGuards)) {
        throw 'Guardie non confermate: nessuna rimozione delle ACL originali.'
    }
    if ($Mode -eq 'Quarantine') {
        return [ordered]@{ mode='Quarantine'; snapshotPath=$taskSnapshot; denyGuardsVerified=$true; isolationAccepted=$false }
    }
    # VM stays Off. Any error leaves deny guards in place; never restore broad allows automatically.
    foreach ($taskRule in $taskContext.Simple) {
        Assert-MercurionVmOff
        Remove-VMNetworkAdapterAcl -InputObject $taskRule -Confirm:$false -ErrorAction Stop
    }
    foreach ($taskRule in $taskContext.Extended) {
        Assert-MercurionVmOff
        Remove-VMNetworkAdapterExtendedAcl -InputObject $taskRule -Confirm:$false -ErrorAction Stop
    }
    foreach ($taskRule in $taskExpected) { Add-MercurionAclRule $taskContext.Nic $taskRule }
    $taskSimple = @(Get-VMNetworkAdapterAcl -VMNetworkAdapter $taskContext.Nic -ErrorAction Stop)
    $taskRead = @(Get-VMNetworkAdapterExtendedAcl -VMNetworkAdapter $taskContext.Nic -ErrorAction Stop)
    if ($taskSimple.Count -ne 0 -or -not (Test-MercurionAclRules $taskRead @($taskExpected + $taskGuards))) {
        throw 'Policy non confermata: guardie conservate, usare la console.'
    }
    try {
        foreach ($taskGuard in $taskGuards) {
            Assert-MercurionVmOff
            Remove-VMNetworkAdapterExtendedAcl -VMNetworkAdapter $taskContext.Nic -Weight 10000 -Direction $taskGuard.Direction -Confirm:$false -ErrorAction Stop
        }
        $taskFinal = Get-MercurionVmAclContext
        if ($taskFinal.Simple.Count -ne 0 -or -not (Test-MercurionAclRules $taskFinal.Extended $taskExpected)) {
            throw 'Readback finale inatteso.'
        }
    } catch {
        # Best effort only: API failure may also prevent reinstallation of a guard.
        # Keep VM Off; never claim network isolation after any failure.
        foreach ($taskGuard in $taskGuards) {
            try {
                $taskCurrent = @(Get-VMNetworkAdapterExtendedAcl -VMNetworkAdapter $taskContext.Nic -ErrorAction Stop |
                    Where-Object { $_.Weight -eq 10000 -and [string]$_.Direction -eq $taskGuard.Direction })
                if ($taskCurrent.Count -eq 0) { Add-MercurionAclRule $taskContext.Nic $taskGuard }
            } catch { }
        }
        throw 'Verifica finale fallita; ripristino guardie solo best effort. Lasciare la VM Spenta e usare la console.'
    }
    return [ordered]@{
        mode='Apply'; snapshotPath=$taskSnapshot; settingsReadbackVerified=$true
        extendedRuleCount=$taskFinal.Extended.Count; internetEgressEnabled=$false
        isolationAccepted=$false; vmStarted=$false; adapterMoved=$false
    }
}

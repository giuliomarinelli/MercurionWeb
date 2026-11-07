#!/usr/bin/env bash
# INF-VM-02: inventory only. Run explicitly on the identified Ubuntu guest.
# No installations, service changes, credentials, daemon.json or Docker env dumps.
set -u
incomplete=0

section() { printf '\n[%s]\n' "$1"; }
read_section() {
    local label="$1"
    shift
    section "$label"
    if ! command -v "$1" >/dev/null 2>&1; then
        printf 'NOT_OBSERVED: command unavailable\n'
        incomplete=1
    elif ! "$@"; then
        printf 'NOT_OBSERVED: read failed\n'
        incomplete=1
    fi
}

section 'scope'
printf 'guest-inventory-only; inventoryRevision=2; isolationAccepted=false\n'
date -u '+%Y-%m-%dT%H:%M:%SZ'
section 'os'
if [[ ! -r /etc/os-release ]]; then
    printf 'NOT_OBSERVED: os-release unavailable\n'
    exit 2
fi
awk '/^(ID|VERSION_ID|PRETTY_NAME)=/' /etc/os-release
if ! awk -F= '$1=="ID" && ($2=="ubuntu" || $2=="\"ubuntu\"") {found=1} END {exit !found}' /etc/os-release; then
    printf 'STOP: target is not an identified Ubuntu guest\n'
    exit 2
fi
read_section 'architecture' uname -m
read_section 'cpu-count' getconf _NPROCESSORS_ONLN
read_section 'memory' free -m
read_section 'root-mount' findmnt --noheadings --output TARGET,SOURCE,FSTYPE --target /
# Deliberately omit UUIDs, serial numbers and encryption key material.
read_section 'block-devices' lsblk --json --output NAME,TYPE,FSTYPE,MOUNTPOINTS
read_section 'addresses' ip -j address show
read_section 'ipv4-routes' ip -j -4 route show
read_section 'ipv6-routes' ip -j -6 route show
read_section 'ipv6-link-local-routes' ip -j -6 route show table local
read_section 'listeners' ss -lnt
read_section 'ipv4-forwarding' sysctl net.ipv4.ip_forward
read_section 'ipv6-forwarding' sysctl net.ipv6.conf.all.forwarding

section 'effective-ssh-policy'
if [[ "$EUID" -eq 0 ]] && command -v sshd >/dev/null 2>&1; then
    # Filters the effective policy, not host keys or user private key files.
    if ! policy=$(sshd -T 2>/dev/null); then
        printf 'NOT_OBSERVED: sshd effective config unavailable\n'
        incomplete=1
    else
        printf '%s\n' "$policy" | awk '/^(pubkeyauthentication|passwordauthentication|kbdinteractiveauthentication|permitrootlogin|allowtcpforwarding|gatewayports|permitopen|listenaddress|allowusers|allowgroups) /'
    fi
else
    printf 'NOT_OBSERVED: requires an explicitly privileged read on the guest\n'
    incomplete=1
fi

section 'docker-locality'
if ! command -v docker >/dev/null 2>&1; then
    printf 'NOT_OBSERVED: Docker Engine/Compose not installed\n'
    exit 2
fi
# Do not query a remote daemon inherited through the caller's CLI configuration.
endpoint=${DOCKER_HOST:-}
if [[ -z "$endpoint" ]]; then
    endpoint=$(docker context inspect --format '{{.Endpoints.docker.Host}}' 2>/dev/null) || endpoint=''
fi
case "$endpoint" in
    unix:///*) printf 'local-unix-socket\n' ;;
    *) printf 'STOP: local Docker endpoint not established; no daemon contacted\n'; exit 2 ;;
esac
docker_local() { env -u DOCKER_CONTEXT -u DOCKER_HOST docker --host "$endpoint" "$@"; }
read_section 'docker-server' docker_local version --format '{{.Server.Version}} {{.Server.Os}} {{.Server.Arch}}'
read_section 'compose-plugin' docker_local compose version --short
read_section 'docker-security-options' docker_local info --format '{{json .SecurityOptions}}'
read_section 'docker-firewall-backend' docker_local info --format '{{json .FirewallBackend}}'
read_section 'published-ports' docker_local ps --format '{{.Names}} {{.Ports}}'
read_section 'networks' docker_local network ls --format '{{.Name}} {{.Driver}}'
read_section 'cached-image-identities' docker_local image ls --digests --format '{{.Repository}}:{{.Tag}} {{.Digest}}'

section 'firewall-readiness'
printf 'Backend and effective filtering require manual review; no acceptance inferred.\n'
if [[ "$EUID" -eq 0 ]]; then
    read_section 'iptables-version' iptables --version
    read_section 'ip6tables-version' ip6tables --version
    read_section 'iptables-input' iptables -S INPUT
    read_section 'iptables-forward' iptables -S FORWARD
    read_section 'iptables-docker-user' iptables -S DOCKER-USER
    read_section 'ip6tables-input' ip6tables -S INPUT
    read_section 'ip6tables-forward' ip6tables -S FORWARD
    read_section 'ip6tables-docker-user' ip6tables -S DOCKER-USER
    read_section 'nftables' nft --json list ruleset
else
    printf 'NOT_OBSERVED: privileged firewall read not performed\n'
    incomplete=1
fi
section 'result'
printf 'isolationAccepted=false; do not publish services based on this inventory\n'
exit "$(( incomplete == 0 ? 0 : 2 ))"

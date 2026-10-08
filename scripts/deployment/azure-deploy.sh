#!/usr/bin/env bash
set -euo pipefail
umask 077
resource_group=${1:?Usage: azure-deploy.sh resource-group secure-parameters.json}
parameters=${2:?Supply a secure Bicep parameters JSON file}
: "${COST_APPROVED:?Set COST_APPROVED=yes only after approving the Azure resource cost}"
[[ "$COST_APPROVED" == yes ]] || exit 1
command -v az >/dev/null
python3 - "$parameters" <<'PY'
import ipaddress,json,sys
p=json.load(open(sys.argv[1]))['parameters']
for name in ['frontendImage','backendImage','migrationImage']:
    if '@sha256:' not in p[name]['value']: raise SystemExit('Immutable image digests required')
rules=p.get('databaseFirewallRules',{}).get('value',[])
if not rules: raise SystemExit('Explicit database firewall rules required; ingress IP is not egress')
for rule in rules:
    start=ipaddress.IPv4Address(rule['startIpAddress']); end=ipaddress.IPv4Address(rule['endIpAddress'])
    if start.is_unspecified or end.is_unspecified or start>end or int(end)-int(start)>255:
        raise SystemExit('Firewall rule is too broad or invalid')
PY
# Existing resource group/subscription must already be explicitly selected.
az account show --query id -o tsv >/dev/null
az deployment group what-if --resource-group "$resource_group" --template-file infra/main.bicep --parameters "@$parameters" deployApplication=false --only-show-errors
az deployment group create --resource-group "$resource_group" --template-file infra/main.bicep --parameters "@$parameters" deployApplication=false --only-show-errors --output none
job=$(python3 - "$parameters" <<'PY'
import json,sys
p=json.load(open(sys.argv[1]))['parameters']; print(p['prefix']['value']+'-'+p['stage']['value']+'-migrate')
PY
)
execution=$(az containerapp job start --resource-group "$resource_group" --name "$job" --query name -o tsv --only-show-errors)
for attempt in {1..120}; do
  state=$(az containerapp job execution show --resource-group "$resource_group" --name "$job" --job-execution-name "$execution" --query properties.status -o tsv --only-show-errors)
  case "$state" in
    Succeeded) break ;;
    Failed|Stopped) echo 'Migration failed; application image was not updated' >&2; exit 1 ;;
  esac
  sleep 5
done
[[ "$state" == Succeeded ]] || { echo 'Migration timeout; application image was not updated' >&2; exit 1; }
az deployment group create --resource-group "$resource_group" --template-file infra/main.bicep --parameters "@$parameters" deployApplication=true --only-show-errors --output none

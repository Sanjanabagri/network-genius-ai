export type SampleProject = {
  tool: string;
  title: string;
  vendor?: string;
  language?: string;
  prompt: string;
  output: string;
};

export const SAMPLE_PROJECTS: SampleProject[] = [
  {
    tool: "config",
    title: "Sample · Branch access switch baseline (Cisco IOS-XE)",
    vendor: "Cisco IOS-XE",
    prompt:
      "Create a Cisco IOS-XE access switch baseline: hostname BR1-ACC-01, NTP, SSH-only management, AAA to RADIUS, and ports Gi1/0/1-24 as access VLAN 20 with portfast and BPDU guard.",
    output: `# Branch Access Switch Baseline — BR1-ACC-01

\`\`\`
hostname BR1-ACC-01
!
ip domain-name corp.example.com
crypto key generate rsa modulus 2048
ip ssh version 2
line vty 0 15
 transport input ssh
 login authentication default
!
aaa new-model
aaa authentication login default group radius local
aaa authorization exec default group radius local
radius server RAD1
 address ipv4 10.10.10.10 auth-port 1812 acct-port 1813
 key <REDACTED>
!
ntp server 10.10.10.5 prefer
ntp server 10.10.20.5
!
vlan 20
 name USERS
!
interface range GigabitEthernet1/0/1-24
 description USER ACCESS
 switchport mode access
 switchport access vlan 20
 spanning-tree portfast
 spanning-tree bpduguard enable
 no shutdown
\`\`\`

## Verification
- \`show run | section aaa\`
- \`show ntp status\`
- \`show spanning-tree interface gi1/0/1 detail\``,
  },
  {
    tool: "cli",
    title: "Sample · OSPF neighbor stuck in EXSTART",
    vendor: "Cisco IOS-XE",
    prompt:
      "Analyze this output and tell me why the OSPF neighbor is stuck in EXSTART.\n\nshow ip ospf neighbor -> 10.0.0.2  1  EXSTART/DR  00:00:31  10.0.0.2  Gi0/1",
    output: `# Analysis — OSPF stuck in EXSTART

## Most likely root cause
**MTU mismatch** between the two interfaces. OSPF exchanges DBD packets in EXSTART/EXCHANGE; if the received DBD exceeds the local interface MTU, the adjacency never advances.

## Ranked causes
1. MTU mismatch (90%) — check \`show interface Gi0/1 | include MTU\` on both ends.
2. Unicast reachability issue between the neighbors (5%).
3. Duplicate router-id (5%).

## Fix
\`\`\`
interface GigabitEthernet0/1
 ip mtu 1500
\`\`\`
Or, as a workaround: \`ip ospf mtu-ignore\`

## Verify
- \`show ip ospf neighbor\` should reach FULL
- \`debug ip ospf adj\` during re-negotiation`,
  },
  {
    tool: "automation-studio",
    title: "Sample · Netmiko NTP rollout with backup and rollback",
    language: "Python (Netmiko)",
    prompt:
      "Write a Netmiko script that reads devices from inventory.yaml, backs up the running config, then applies an NTP server change, with rollback on failure.",
    output: `# Netmiko NTP rollout

\`\`\`python
import yaml, datetime, pathlib
from netmiko import ConnectHandler

NTP = ["ntp server 10.10.10.5 prefer", "ntp server 10.10.20.5"]
BACKUP = pathlib.Path("backups"); BACKUP.mkdir(exist_ok=True)

def run(device):
    conn = ConnectHandler(**device)
    name = conn.find_prompt().strip("#>")
    stamp = datetime.datetime.now().strftime("%Y%m%d-%H%M%S")
    running = conn.send_command("show running-config")
    (BACKUP / f"{name}-{stamp}.cfg").write_text(running)
    try:
        conn.send_config_set(NTP)
        out = conn.send_command("show ntp status")
        if "Clock is" not in out:
            raise RuntimeError("NTP verification failed")
        conn.save_config()
        print(f"[OK] {name}")
    except Exception as exc:
        print(f"[FAIL] {name}: {exc} — rolling back")
        conn.send_config_set([f"no {c}" for c in NTP])
    finally:
        conn.disconnect()

if __name__ == "__main__":
    for d in yaml.safe_load(open("inventory.yaml"))["devices"]:
        run(d)
\`\`\`

## Notes
- Backups are written before any change.
- Rollback reverses only the commands this script applied.`,
  },
];

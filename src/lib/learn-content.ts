import type { ToolId } from "@/lib/ai.functions";

/* ----------------------------- Knowledge articles ----------------------------- */

export type ArticleSection = { heading: string; body: string; bullets?: string[]; code?: string };

export type Article = {
  slug: string;
  title: string;
  category: "Routing" | "Switching" | "Security" | "SD-WAN" | "Automation" | "Operations";
  readMinutes: number;
  summary: string;
  vendors: string[];
  sections: ArticleSection[];
  tool?: ToolId;
  prompt?: string;
};

export const ARTICLES: Article[] = [
  {
    slug: "bgp-neighbor-troubleshooting",
    title: "BGP neighbor stuck in Idle or Active: a field checklist",
    category: "Routing",
    readMinutes: 6,
    summary: "A repeatable order of checks that resolves most eBGP and iBGP adjacency failures before escalation.",
    vendors: ["Cisco IOS-XE", "Cisco NX-OS", "Juniper Junos", "Arista EOS"],
    sections: [
      {
        heading: "Understand the state first",
        body: "BGP state tells you where the failure is. Idle usually means the peer is unreachable or administratively down. Active means TCP 179 is failing. OpenSent/OpenConfirm means TCP works but parameters disagree.",
        bullets: [
          "Idle → reachability, route to peer, or shutdown",
          "Active → TCP 179 blocked, wrong source interface, or ACL",
          "OpenSent → AS number mismatch or bad router-id",
          "OpenConfirm → authentication or hold-timer mismatch",
        ],
      },
      {
        heading: "Checks in order",
        body: "Work from Layer 3 upward. Do not change configuration until each step is verified.",
        bullets: [
          "Ping the peer using the same source interface BGP uses",
          "Confirm the route to the peer exists and is not recursive through the peer itself",
          "Verify remote-as on both ends and update-source / local-address",
          "Check eBGP multihop when peers are not directly connected",
          "Confirm MD5 / TCP-AO keys match exactly, including trailing spaces",
          "Look for control-plane policing or an infrastructure ACL dropping TCP 179",
        ],
        code: "show ip bgp summary\nshow ip bgp neighbors <peer> | include state|Last reset|password\nshow ip route <peer>\nshow logging | include BGP",
      },
      {
        heading: "When the session is up but prefixes are missing",
        body: "An established session with zero prefixes is a policy problem, not a transport problem.",
        bullets: [
          "Check inbound and outbound route-maps / policy-statements",
          "Verify the prefix is actually in the RIB and matches a network statement or redistribution",
          "For iBGP, confirm next-hop-self or a route-reflector is in place",
          "Check maximum-prefix limits — a peer can be shut down silently",
        ],
      },
    ],
    tool: "cli",
    prompt: "Analyze this BGP output and tell me why the neighbor is not establishing:\n\n<paste show ip bgp summary and show ip bgp neighbors here>",
  },
  {
    slug: "ospf-adjacency-states",
    title: "OSPF adjacency states and what each stall really means",
    category: "Routing",
    readMinutes: 5,
    summary: "Decode INIT, 2-WAY, EXSTART and LOADING stalls and fix the underlying mismatch fast.",
    vendors: ["Cisco IOS-XE", "Juniper Junos", "Arista EOS"],
    sections: [
      {
        heading: "Map the stall to the cause",
        body: "Each stuck state points at a small set of mismatches.",
        bullets: [
          "INIT → hellos are one-way; check ACLs, multicast, and passive-interface",
          "2-WAY on a broadcast segment is normal for DROther-to-DROther",
          "EXSTART / EXCHANGE → MTU mismatch is the classic cause",
          "LOADING → corrupted or oversized LSA, or repeated retransmissions",
        ],
      },
      {
        heading: "Mismatches that silently break adjacency",
        body: "Hello and dead intervals, area ID, area type (stub/NSSA), authentication, subnet mask, and network type must all agree on the segment.",
        code: "show ip ospf interface brief\nshow ip ospf neighbor detail\ndebug ip ospf adj   ! use with care in production",
      },
      {
        heading: "MTU: verify, don't assume",
        body: "Test with a do-not-fragment ping sized to the interface MTU. Tunnels and provider circuits often shave bytes you did not account for.",
        code: "ping <peer> df-bit size 1500",
      },
    ],
    tool: "cli",
    prompt: "Analyze this OSPF output and tell me why the neighbor is stuck in EXSTART:\n\n<paste show ip ospf neighbor and show ip ospf interface here>",
  },
  {
    slug: "stp-loops-and-storms",
    title: "Spanning tree loops and broadcast storms: containment first",
    category: "Switching",
    readMinutes: 5,
    summary: "How to stabilise a looping access layer under pressure, then find the root cause safely.",
    vendors: ["Cisco IOS-XE", "Cisco NX-OS", "Arista EOS"],
    sections: [
      {
        heading: "Stabilise before you investigate",
        body: "During a storm the management plane may be unreachable. Use console access and isolate first.",
        bullets: [
          "Identify the segment by CPU spike and interface utilisation counters",
          "Shut the suspected redundant link to break the loop",
          "Do not reboot switches — you lose the evidence and the topology recovers into the same loop",
        ],
      },
      {
        heading: "Root cause checklist",
        body: "Most loops trace back to a small number of design or human errors.",
        bullets: [
          "Unidirectional link — enable UDLD or loop guard",
          "BPDU filter or a rogue switch below an access port — enforce BPDU guard and root guard",
          "Etherchannel mismatch (one side on, one side passive)",
          "Mismatched spanning tree modes between vendors (PVST vs MSTP vs RSTP)",
        ],
        code: "show spanning-tree detail | include ieee|from|occurr\nshow interfaces counters errors\nshow spanning-tree inconsistentports",
      },
      {
        heading: "Prevention",
        body: "Standardise edge port templates: portfast, BPDU guard, storm control, and errdisable recovery with a bounded timer.",
      },
    ],
    tool: "config",
    prompt: "Generate a hardened access-port template for Cisco IOS-XE with portfast, BPDU guard, storm control, port-security, and errdisable recovery.",
  },
  {
    slug: "ipsec-vpn-debugging",
    title: "Site-to-site IPSec that won't come up: phase 1 vs phase 2",
    category: "Security",
    readMinutes: 7,
    summary: "Split the failure into IKE and IPSec SA problems and compare proposals across vendors correctly.",
    vendors: ["Cisco IOS-XE", "Palo Alto PAN-OS", "Fortinet FortiGate", "Juniper SRX"],
    sections: [
      {
        heading: "Decide which phase is failing",
        body: "If IKE never reaches established, it is phase 1. If IKE is up but no traffic passes, it is phase 2 or the proxy-ID / traffic selector.",
        code: "show crypto ikev2 sa\nshow crypto ipsec sa peer <ip>\n! PAN-OS: show vpn ike-sa / show vpn ipsec-sa\n! FortiGate: diagnose vpn ike gateway list / diagnose vpn tunnel list",
      },
      {
        heading: "Phase 1 mismatches",
        body: "Every proposal attribute must match on both ends.",
        bullets: [
          "IKE version, encryption, hash/PRF, DH group, lifetime",
          "Peer identity type (IP vs FQDN) — very common Palo Alto ↔ Cisco issue",
          "Pre-shared key copied with a trailing whitespace",
          "NAT-T required when a device sits behind NAT",
        ],
      },
      {
        heading: "Phase 2 and traffic selectors",
        body: "Cisco crypto ACLs, Palo Alto proxy-IDs and Fortinet phase-2 selectors describe the same thing and must mirror each other exactly.",
        bullets: [
          "Mirror the local/remote subnets, do not summarise on one side only",
          "PFS group must match, or rekey will fail after the first lifetime",
          "Route-based tunnels need a route pointing at the tunnel interface",
          "Check MSS clamping (1350–1380) for TCP sessions that hang after handshake",
        ],
      },
    ],
    tool: "multi-vendor",
    prompt: "Configure an IPSec site-to-site VPN between a branch and datacenter with IKEv2, AES-256, PFS group 14, and dead peer detection.",
  },
  {
    slug: "firewall-policy-hygiene",
    title: "Firewall rulebase hygiene for audits",
    category: "Security",
    readMinutes: 5,
    summary: "Least-privilege policy structure, logging standards, and the cleanup process auditors expect.",
    vendors: ["Palo Alto PAN-OS", "Fortinet FortiGate", "Cisco ASA/FTD"],
    sections: [
      {
        heading: "Structure the rulebase",
        body: "Order rules by specificity and group them by intent so future engineers can read the policy without tribal knowledge.",
        bullets: [
          "Explicit deny with logging at the bottom of every zone pair",
          "No any-any-any rules, including in the management zone",
          "Use address groups and service objects, never raw IPs in rules",
          "Name rules with a ticket reference and owner",
        ],
      },
      {
        heading: "Cleanup process",
        body: "Run a quarterly review using hit counts and rule age before deleting anything.",
        bullets: [
          "Find zero-hit rules older than 90 days and disable before removing",
          "Identify shadowed and redundant rules",
          "Document every exception with an expiry date",
        ],
      },
      {
        heading: "Logging standards",
        body: "Log at session end for allowed traffic and at session start for denies. Forward to SIEM with a consistent zone/rule naming scheme so correlation works.",
      },
    ],
    tool: "multi-vendor",
    prompt: "Create a hardened DMZ security policy: allow only HTTPS inbound to web servers, deny all east-west by default, log denies, and add anti-spoofing.",
  },
  {
    slug: "sdwan-brownout-triage",
    title: "SD-WAN brownouts: triaging jitter, loss and tunnel flaps",
    category: "SD-WAN",
    readMinutes: 6,
    summary: "Separate underlay transport problems from overlay policy problems on Viptela, Velocloud and Meraki.",
    vendors: ["Cisco SD-WAN (Viptela)", "VeloCloud", "Meraki", "Fortinet SD-WAN"],
    sections: [
      {
        heading: "Underlay or overlay?",
        body: "Always characterise the transport before touching policy. BFD statistics give you loss, latency and jitter per colour.",
        code: "show sdwan bfd sessions\nshow sdwan tunnel statistics\nshow sdwan app-route stats",
      },
      {
        heading: "Common causes of voice-impacting brownouts",
        body: "Brownouts rarely show as a hard down.",
        bullets: [
          "Broadband circuit micro-loss under load — check ISP CPE counters",
          "Shaper misconfigured above the real circuit rate, causing buffer bloat",
          "App-route SLA thresholds too loose, so traffic never fails over",
          "Asymmetric routing between two transports for the same flow",
        ],
      },
      {
        heading: "What to change",
        body: "Tighten SLA classes for real-time traffic, set the shaper to 90–95% of the measured rate, and enable per-tunnel QoS from hub to spoke.",
      },
    ],
    tool: "troubleshoot",
    prompt: "Branch users report choppy VoIP for 20 minutes each afternoon on an SD-WAN broadband transport. Walk me through a triage plan and the likely causes.",
  },
  {
    slug: "idempotent-automation",
    title: "Writing automation that is safe to run twice",
    category: "Automation",
    readMinutes: 6,
    summary: "Idempotency, dry-run, and rollback patterns for Python, Ansible and Nornir in production networks.",
    vendors: ["Ansible", "Nornir", "Netmiko", "NAPALM"],
    sections: [
      {
        heading: "Idempotency is the whole game",
        body: "A change script that is unsafe to re-run will eventually be re-run. Use declarative modules or compare before you write.",
        bullets: [
          "Prefer structured modules (ios_config, junos_config) over raw CLI sends",
          "Always pull and store the pre-change config",
          "Use check mode / diff before apply",
          "Fail fast on any device that does not match the expected baseline",
        ],
      },
      {
        heading: "A safe change wrapper",
        body: "Every production script should follow the same four phases.",
        bullets: [
          "Pre-check: reachability, version, current state capture",
          "Apply: change in a transaction or with a commit confirm timer",
          "Post-check: verify intent (neighbors up, routes present, no new errors)",
          "Rollback: automatic if post-checks fail",
        ],
        code: "# Junos and IOS-XE both support a confirm timer\ncommit confirmed 5\n! IOS-XE\nconfigure terminal revert timer 5",
      },
      {
        heading: "Inventory and secrets",
        body: "Keep inventory in version control, keep credentials out of it. Use a vault or environment-injected secrets, and never log the password variable.",
      },
    ],
    tool: "automation-studio",
    prompt: "Write a Nornir script that backs up configs, applies an NTP change with commit-confirm, runs post-checks, and rolls back automatically on failure.",
  },
  {
    slug: "change-windows-and-mops",
    title: "Running a change window that passes audit",
    category: "Operations",
    readMinutes: 5,
    summary: "What a complete MOP contains, who signs off, and how to define backout criteria that are actually actionable.",
    vendors: ["Vendor agnostic"],
    sections: [
      {
        heading: "Anatomy of a complete MOP",
        body: "An auditable MOP leaves nothing to interpretation at 2am.",
        bullets: [
          "Scope, risk rating, and affected services",
          "Pre-checks with expected output captured before the window",
          "Exact commands in execution order, per device",
          "Validation steps with measurable pass criteria",
          "Backout trigger conditions and the exact reverse commands",
          "Communication plan and named approvers",
        ],
      },
      {
        heading: "Backout criteria people can act on",
        body: "\"If something goes wrong\" is not a criterion. Write thresholds: adjacency not restored within 5 minutes, packet loss above 1% for 3 consecutive minutes, or any P1 alarm on the affected service.",
      },
      {
        heading: "After the window",
        body: "Capture post-change state, attach it to the ticket, and record any deviation from the MOP — deviations are the source of the next incident.",
      },
    ],
    tool: "mop",
    prompt: "Write a MOP to migrate a core switch stack from HSRP to VRRP during a 2-hour window, with pre-checks, validation and backout criteria.",
  },
];

/* ----------------------------- Vendor documentation ----------------------------- */

export type DocLink = { label: string; url: string; note: string };
export type DocGroup = { vendor: string; links: DocLink[] };

export const DOC_LIBRARY: DocGroup[] = [
  {
    vendor: "Cisco",
    links: [
      { label: "Cisco IOS-XE configuration guides", url: "https://www.cisco.com/c/en/us/support/ios-nx-os-software/ios-xe-17/series.html", note: "Feature and command references by release" },
      { label: "Cisco NX-OS documentation", url: "https://www.cisco.com/c/en/us/support/switches/nexus-9000-series-switches/series.html", note: "Nexus 9000 configuration and troubleshooting" },
      { label: "Cisco Catalyst SD-WAN docs", url: "https://www.cisco.com/c/en/us/support/routers/sd-wan/series.html", note: "Viptela / Catalyst SD-WAN design and config" },
      { label: "Cisco Validated Designs", url: "https://www.cisco.com/c/en/us/solutions/design-zone.html", note: "Reference architectures you can cite in design docs" },
    ],
  },
  {
    vendor: "Juniper",
    links: [
      { label: "Junos OS documentation", url: "https://www.juniper.net/documentation/us/en/software/junos/", note: "Full Junos configuration and CLI reference" },
      { label: "Juniper SRX security docs", url: "https://www.juniper.net/documentation/product/us/en/srx-series/", note: "Security policy, NAT and IPSec" },
      { label: "Juniper Day One library", url: "https://www.juniper.net/documentation/jnbooks/us/en/day-one-books/", note: "Free practical engineering books" },
    ],
  },
  {
    vendor: "Arista",
    links: [
      { label: "Arista EOS user manual", url: "https://www.arista.com/en/support/product-documentation", note: "EOS configuration and CLI guide" },
      { label: "Arista EOS Central", url: "https://eos.arista.com/", note: "Community articles, scripts and design guides" },
    ],
  },
  {
    vendor: "Palo Alto Networks",
    links: [
      { label: "PAN-OS administrator's guide", url: "https://docs.paloaltonetworks.com/pan-os", note: "Policy, NAT, decryption, HA and logging" },
      { label: "Panorama documentation", url: "https://docs.paloaltonetworks.com/panorama", note: "Centralised management and templates" },
      { label: "Best practice assessment guides", url: "https://docs.paloaltonetworks.com/best-practices", note: "Hardening baselines for audits" },
    ],
  },
  {
    vendor: "Fortinet",
    links: [
      { label: "FortiGate administration guide", url: "https://docs.fortinet.com/product/fortigate/", note: "FortiOS policy, SD-WAN and VPN" },
      { label: "Fortinet Cookbook", url: "https://docs.fortinet.com/document/fortigate/", note: "Task-based recipes with verified steps" },
    ],
  },
  {
    vendor: "Standards & automation",
    links: [
      { label: "IETF RFC index", url: "https://www.rfc-editor.org/rfc-index.html", note: "Authoritative protocol behaviour" },
      { label: "Ansible network automation docs", url: "https://docs.ansible.com/ansible/latest/network/index.html", note: "Network modules, inventory and idempotency" },
      { label: "Nornir documentation", url: "https://nornir.readthedocs.io/", note: "Python-native automation framework" },
      { label: "NAPALM documentation", url: "https://napalm.readthedocs.io/", note: "Vendor-neutral config and getters" },
      { label: "Netmiko documentation", url: "https://github.com/ktbyers/netmiko", note: "SSH automation for network devices" },
      { label: "Batfish network validation", url: "https://batfish.org/", note: "Pre-deployment config analysis" },
    ],
  },
];

/* ----------------------------- Communities ----------------------------- */

export type Community = {
  name: string;
  url: string;
  kind: "Forum" | "Chat" | "Reddit" | "Q&A" | "Vendor";
  vendors: string[];
  blurb: string;
};

export const COMMUNITIES: Community[] = [
  {
    name: "Cisco Community",
    url: "https://community.cisco.com/",
    kind: "Vendor",
    vendors: ["Cisco"],
    blurb: "Official Cisco forums — routing, switching, SD-WAN and security boards with Cisco engineers answering.",
  },
  {
    name: "Juniper Networks Community",
    url: "https://community.juniper.net/",
    kind: "Vendor",
    vendors: ["Juniper"],
    blurb: "Junos, SRX and Mist discussion with Juniper staff and JNCIE-level contributors.",
  },
  {
    name: "Arista Networks Community (EOS Central)",
    url: "https://eos.arista.com/forum/",
    kind: "Vendor",
    vendors: ["Arista"],
    blurb: "EOS configuration questions, eAPI scripting and automation examples.",
  },
  {
    name: "Palo Alto Networks LIVEcommunity",
    url: "https://live.paloaltonetworks.com/",
    kind: "Vendor",
    vendors: ["Palo Alto"],
    blurb: "PAN-OS policy, GlobalProtect and Panorama troubleshooting threads.",
  },
  {
    name: "Fortinet Community",
    url: "https://community.fortinet.com/",
    kind: "Vendor",
    vendors: ["Fortinet"],
    blurb: "FortiOS, FortiGate SD-WAN and FortiManager knowledge base plus open forums.",
  },
  {
    name: "r/networking",
    url: "https://www.reddit.com/r/networking/",
    kind: "Reddit",
    vendors: ["Multi-vendor"],
    blurb: "The largest working-engineer community. Great for design opinions and vendor-neutral problems.",
  },
  {
    name: "r/ccna and r/ccnp",
    url: "https://www.reddit.com/r/ccna/",
    kind: "Reddit",
    vendors: ["Cisco"],
    blurb: "Certification study help and lab troubleshooting for people building fundamentals.",
  },
  {
    name: "r/networkautomation",
    url: "https://www.reddit.com/r/networkautomation/",
    kind: "Reddit",
    vendors: ["Multi-vendor"],
    blurb: "Python, Ansible, Nornir and CI/CD-for-network discussion.",
  },
  {
    name: "Network to Code Slack",
    url: "https://networktocode.slack.com/",
    kind: "Chat",
    vendors: ["Multi-vendor"],
    blurb: "The reference chat community for network automation — channels for Ansible, Nornir, Netbox, Batfish and more.",
  },
  {
    name: "Packet Pushers Community",
    url: "https://packetpushers.net/community/",
    kind: "Forum",
    vendors: ["Multi-vendor"],
    blurb: "Engineer-led discussion, podcasts and design debates across vendors.",
  },
  {
    name: "Network Engineering Stack Exchange",
    url: "https://networkengineering.stackexchange.com/",
    kind: "Q&A",
    vendors: ["Multi-vendor"],
    blurb: "Precise, citation-heavy answers for protocol and standards questions.",
  },
  {
    name: "NANOG mailing list",
    url: "https://www.nanog.org/resources/mailing-lists/",
    kind: "Forum",
    vendors: ["Service provider"],
    blurb: "Operator-level discussion for peering, BGP policy and internet-scale routing.",
  },
];

export const ARTICLE_CATEGORIES = [
  "All",
  "Routing",
  "Switching",
  "Security",
  "SD-WAN",
  "Automation",
  "Operations",
] as const;

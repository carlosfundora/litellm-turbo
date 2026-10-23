# Data Privacy and Security


## Security Vulnerability Reporting Guidelines

We value the security community's role in protecting our systems and users. To report a security vulnerability:

- File a private vulnerability report on GitHub: [Report a vulnerability](https://github.com/BerriAI/litellm/security/advisories/new)
- Include steps to reproduce the issue
- Provide any relevant additional information

### Vulnerability Categories

We classify vulnerabilities into the following categories:

**P0: Supply Chain Attacks**

Attacks that compromise our CI/CD pipeline, allowing a malicious actor to point our PyPI package or Docker images (GHCR or Docker Hub) to vulnerable or tampered artifacts.

**P1: Unauthenticated Proxy Access**

Application-level attacks where an unauthenticated user is able to gain access to protected data on a LiteLLM proxy instance that should be protected (e.g api keys).

**P2: Authenticated Malicious Actions**

Application-level attacks where an authenticated user is able to perform actions beyond their intended permissions, such as privilege escalation or unauthorized data access.

### Bug Bounty Program

We offer bounties for responsibly disclosed vulnerabilities based on severity:

**Note that currently only P0/P1 reports are eligible for a bounty, though submissions for P2 bugs are still encouraged**

| Severity | Bounty Range | Example |
|----------|-------------|---------|
| **Critical** | $1,500 - $3,000 | P0 supply chain compromise |
| **High** | $500 - $1,500 | P1 unauthenticated proxy access |
| **Medium** | N/A | P2 authenticated privilege escalation |
| **Low** | N/A | Minor information disclosure, low-impact misconfigurations |

To qualify for a bounty, reports must include clear reproduction steps and must not involve systems or accounts you do not own. We review all submissions promptly and will follow up within 5 business days.

### Known Non-Issues

- Attacks that require a misconfiguration on setup (e.g not setting a `master_key` on the proxy configuration), are **explicitly not in scope** and are not considered vulnerable.

## Security Measures

### LiteLLM Github

- All commits run through Github's CodeQL checking

### Self-hosted Instances LiteLLM

- **No data or telemetry is stored on LiteLLM Servers when you self host**
- For installation and configuration, see: [Self-hosting guided](https://docs.litellm.ai/docs/proxy/deploy)
- **Telemetry** We run no telemetry when you self host LiteLLM

### LiteLLM Cloud

- We encrypt all data stored using your `LITELLM_MASTER_KEY` and in transit using TLS.
- Our database and application run on GCP, AWS infrastructure, partly managed by NeonDB.
    - US data region: Northern California (AWS/GCP `us-west-1`) & Virginia (AWS `us-east-1`)
    - EU data region Germany/Frankfurt (AWS/GCP `eu-central-1`)
- All users have access to SSO (Single Sign-On) through OAuth 2.0 with Google, Okta, Microsoft, KeyCloak. 
- Audit Logs with retention policy
- Control Allowed IP Addresses that can access your Cloud LiteLLM Instance

For security inquiries, please contact us at support@berri.ai

#### Supported data regions for LiteLLM Cloud

LiteLLM supports the following data regions:

- US, Northern California (AWS/GCP `us-west-1`)
- Europe, Frankfurt, Germany (AWS/GCP `eu-central-1`)

All data, user accounts, and infrastructure are completely separated between these two regions


## Fork deployment safety - 2026-10-22

The October 21 LiteLLM incident affected the published 1.107.0 wheels and
upstream floating image tags. A clean Git tag or a removed release does not
clear an environment that already installed the artifacts. See the
[incident report](https://github.com/BerriAI/litellm/issues/47826).

Change record for this fork:

- The Kubernetes example now uses the same complete March image digest as
  `deploy/Dockerfile.ghcr_base`. It preserves the existing gateway configuration,
  arguments, probes, ports, and mounts.
- The default Compose stack keeps its existing build context and uses
  `litellm-turbo:local` with `pull_policy: build`. It builds this locked fork
  instead of preferring a floating upstream image. Do not combine a digest
  reference with this build output tag: Docker needs a writable image tag.
- The custom UI Dockerfile retains its specialized image and pins its current
  index digest. Both platform configurations were dated August 7, 2024.
- The legacy cookbook Dockerfile consumes its existing
  `litellm==1.83.5` requirements file. No dependency upgrade is introduced.
- `make test-supply-chain` runs six file-only Node tests, including rejection
  controls for floating references, the reported malicious digests, the bad
  wheel version, and an unconstrained wheel install. It never starts Python.
  Ordinary Python tests and image builds were not run for this audit.

The Helm default remains `litellm-database:main-v1.80.12`, derived from the
chart's explicit application version. User-provided Helm values, build argument
overrides, legacy notebooks, and documentation install commands can select
different artifacts. Their prior execution is not established by this source
audit. Revalidate the deployed digest and installed metadata before reuse.

The maintained cross-repository inventory, host observations, build history,
coverage limits, and conditional containment plan are recorded in the
[collective audit](https://github.com/carlosfundora/harness/blob/main/docs/audits/system-audit-current.md#litellm-audit-20261022).
These changes prevent the identified default selection paths; they do not
certify previously installed environments or authorize a service restart.

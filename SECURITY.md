# Security Policy

## Supported Versions

We actively support the following versions of this project with security updates:

| Version                | Supported  |
| ---------------------- | ---------- |
| Latest (main / stable) | ✅ Yes      |
| Previous minor release | ⚠️ Limited |
| Older versions         | ❌ No       |

If you are using an unsupported version, please upgrade to the latest release before reporting issues.

---

## Reporting a Vulnerability

We take security vulnerabilities seriously. If you discover a vulnerability, please report it responsibly.

### Preferred Method

Please report vulnerabilities via **private communication**:

* Email: [security@yourdomain.com](mailto:security@yourdomain.com)
* OR GitHub: **Security → Report a vulnerability** (private advisory)

### What to Include

To help us triage quickly, include:

* Description of the vulnerability
* Steps to reproduce (PoC if possible)
* Impact assessment (what can be exploited)
* Affected versions / configurations
* Any suggested remediation (optional)

---

## Response Timeline

We aim to respond according to the following SLA:

| Stage                  | Target Time                                   |
| ---------------------- | --------------------------------------------- |
| Initial acknowledgment | Within 2 weeks                                |
| Triage / validation    | Within 4-8 weeks                              |
| Fix/mitigation plan  | Within each Trimester (depending on severity) |

Critical vulnerabilities may be prioritized and resolved faster.

---

## Disclosure Policy

We follow **Coordinated Vulnerability Disclosure (CVD)**:

* Do **not** publicly disclose the issue before it is resolved
* We will notify you when a fix is available
* We will coordinate public disclosure (if applicable)

We may credit you in the release notes unless you request anonymity.

---

## Scope

This policy applies to:

* Source code in this repository
* Associated APIs and integrations
* Deployment configurations (where applicable)

Out of scope:

* Issues requiring physical access
* Social engineering attacks
* Third-party dependencies (report to respective maintainers)

---

## Severity Classification

We use a simplified severity model aligned with industry standards:

| Severity | Description                                |
| -------- | ------------------------------------------ |
| Critical | Remote code execution, data breach         |
| High     | Privilege escalation, auth bypass          |
| Medium   | Information disclosure, partial compromise |
| Low      | Minor issues with limited impact           |

---

## Safe Harbor

We support **good-faith security research**.

You will not face legal action if you:

* Act in good faith
* Avoid privacy violations or data destruction
* Do not exploit the vulnerability beyond proof-of-concept
* Report the issue promptly

---

## Security Best Practices (for Users)

* Keep dependencies up to date
* Use strong authentication (MFA where possible)
* Restrict API keys and secrets
* Follow least privilege principles

---

## Contact

For any security-related questions:

* [security@yourdomain.com](mailto:security@yourdomain.com)

---

Thank you for helping keep this project secure.

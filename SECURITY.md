# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability, please **DO NOT** file a public issue.

Instead, email **barrie@regenesispod.com** with:
- A description of the vulnerability
- Steps to reproduce
- Potential impact
- Any suggested fix (optional)

## What to expect

- **Acknowledgement** within 48 hours
- **Status update** within 7 days
- **Fix or disclosure timeline** within 30 days for confirmed vulnerabilities

## Scope

This policy covers all code in this repository, including:
- Application code
- Configuration
- Dependencies
- CI/CD pipelines
- Documentation that could lead to vulnerabilities (e.g., insecure examples)

## Out of Scope

- Issues in third-party services we depend on (report to those vendors directly)
- Social engineering attacks
- Physical attacks
- Issues requiring privileged local access

## Recognition

We appreciate security researchers who follow responsible disclosure. With your permission, we will publicly thank you in the release notes when the fix ships.

## Our Stack

This repository is part of an infrastructure that includes:
- GitHub Actions CI with Trivy + Gitleaks security scanning
- Dependabot vulnerability tracking
- CodeRabbit AI security review
- Pre-commit hooks with secret scanning

We take security seriously and appreciate your help keeping our users safe.

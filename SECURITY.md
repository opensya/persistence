# Security Policy

## Reporting a Vulnerability

Please do not report security vulnerabilities through public GitHub issues, discussions or pull requests.

Use [GitHub Private Vulnerability Reporting](https://github.com/opensya/persistence/security/advisories/new) to report vulnerabilities confidentially.

Include as much relevant information as possible:

- The affected package version
- A description of the vulnerability
- Steps or a minimal reproduction
- The potential impact
- Any known mitigation
- Relevant logs or code excerpts without credentials or sensitive data

## Supported Versions

Security updates are provided for the latest published minor version.

| Version | Supported |
| ------- | --------- |
| 0.3.x   | Yes       |
| < 0.3   | No        |

Users should upgrade to the latest available version before reporting an issue that may already have been fixed.

## Response Process

After receiving a report, the maintainers will:

1. Acknowledge the report.
2. Investigate and validate the vulnerability.
3. Determine its severity and affected versions.
4. Prepare a fix and coordinate disclosure when necessary.
5. Publish a security advisory and patched release.

Please allow the maintainers reasonable time to investigate and release a fix before publicly disclosing the vulnerability.

## Scope

Reports may concern any security issue in OpenSya Persistence, including:

- Unsafe query or mutation behavior
- Authorization or field-visibility bypasses
- Tenant data isolation failures
- Audit log integrity
- Domain-event or outbox integrity
- Sensitive-data exposure
- SQL injection through adapters
- Dependency or build-chain vulnerabilities
- Incorrect transaction boundaries

Vulnerabilities that only affect unsupported versions may not receive a patch.

## Security Considerations

OpenSya Persistence provides persistence primitives but does not replace application-level security controls.

Applications remain responsible for:

- Authentication and authorization
- Database credentials and access policies
- Tenant isolation configuration
- Input validation specific to the application domain
- Secure handling of audit logs and domain events
- Dependency and runtime updates
- Production database backups and monitoring

## Safe Harbor

Good-faith security research is welcome. Researchers should avoid:

- Accessing or modifying data that does not belong to them
- Disrupting services or availability
- Exposing personal, confidential or proprietary information
- Using social engineering
- Publicly disclosing an issue before a fix is available

The maintainers will not pursue action against researchers who follow this policy and make a good-faith effort to avoid harm.
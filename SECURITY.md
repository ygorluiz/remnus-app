# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| latest (`master`) | Yes |

## Reporting a Vulnerability

**Please do not open a public GitHub issue for security vulnerabilities.**

Report security issues by emailing **ranorkk@gmail.com**. Include:

- A description of the vulnerability
- Steps to reproduce
- Potential impact
- Any suggested fix (optional)

You will receive a response within **48 hours**. We will work with you to understand and resolve the issue before any public disclosure.

## Scope

Issues we consider in-scope:

- Authentication and authorization bypass (MCP token scope, workspace access control)
- SQL injection via `query_database` filters or any other input
- Rate limit bypass on `/api/mcp`
- XSS in the page editor or workspace UI
- CSRF on server actions
- Privilege escalation (role manipulation, cross-workspace data access)
- Sensitive data exposure via MCP tools or API responses

## Out of Scope

- Vulnerabilities in third-party dependencies (report to the upstream project)
- Self-hosted instances with misconfigured environment variables
- Social engineering attacks

## Disclosure Policy

We follow a **coordinated disclosure** process. Once a fix is confirmed and deployed, we will publish a security advisory on GitHub.

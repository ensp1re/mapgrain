# Security policy

## Reporting a vulnerability

Report privately through GitHub's [security advisory
form](https://github.com/ensp1re/mapgrain/security/advisories/new). Please do not open a public
issue for a vulnerability.

Include what you need to demonstrate it: the document, the command, the version, and what
happens. A Mapgrain diagram is a JSON file, so a reproducer is usually one attachment.

You should get an acknowledgement within a week. If a fix is needed, the advisory is where the
work and the disclosure timing are agreed.

## Supported versions

The published CLI is `mapgrain` on npm. Fixes go into the newest published version; older
pinned versions are not patched. `0.1.0` is kept only so old documents keep resolving and does
not receive fixes.

## What is in scope

Mapgrain runs locally. The parts that take untrusted input are:

- **`validate` and every command that reads a document.** A crafted document should be rejected
  with a diagnostic, never execute anything or read a file it was not given.
- **The exported HTML viewer.** An export must not run remote code, fetch anything, or carry a
  credential. Content from a document is escaped before it reaches the page.
- **`studio`.** It binds loopback and serves exactly one opened file behind a session header. A
  path escaping that file, or a session check that can be skipped, is a vulnerability.
- **The editor's import path.** Opening a file must not be a way to execute something.

## What is out of scope

- Anything that needs an attacker to already run code on your machine.
- Denial of service from a deliberately enormous document. There are size limits; a slow layout
  on a huge graph is a performance issue, not a security one.
- Dependencies with advisories that Mapgrain does not reach. Tell us anyway — we would rather
  update — but it is not treated as a vulnerability in Mapgrain.

There is no hosted service, no account, and no telemetry, so there is nothing server-side to
report.

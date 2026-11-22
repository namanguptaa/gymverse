# Security policy

GymVerse stores personal information such as member names and phone numbers, so security reports are taken seriously.

## Reporting a problem

Please don't open a public issue for security problems. Instead, use GitHub's **Report a vulnerability** button on the repository's Security tab, with steps to reproduce. You'll get a reply within 7 days.

## Running GymVerse safely

- Serve it over HTTPS (see docs/INSTALL.md) and set `COOKIE_SECURE=true`.
- Use a strong owner password, and set an owner PIN for the shared tablet.
- Keep Node.js or the Docker image up to date.
- Copy `data/backups` to another location regularly.

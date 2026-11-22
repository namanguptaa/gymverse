# Contributing to GymVerse

Thanks for helping make GymVerse better for small gyms.

## Ways to help

| Type | How |
| --- | --- |
| Report a bug | Open an issue using the bug report form |
| Suggest a feature | Open an issue describing the gym problem it solves |
| Improve the code | Fork the repo, make your change, open a pull request |
| Translate | Reminder templates and labels in more Indian languages are welcome |

## Run it locally

```bash
git clone https://github.com/<you>/gymverse.git
cd gymverse
npm run dev     # restarts the server when files in server/ change
npm test        # runs the API tests
```

Open http://localhost:3000. Local data goes in `data/`, which git ignores.

Prefer Docker? `docker compose -f docker-compose.dev.yml up --build` builds and runs your local copy.

AI coding tools should follow [AGENTS.md](AGENTS.md).

## Licensing of contributions

GymVerse is licensed under the GNU AGPL-3.0. By sending a pull request, you agree that your contribution is released under the same license.

## Guidelines

- No build step and no npm dependencies, so anyone can run GymVerse with just Node.js.
- Write interface text in plain, simple English.
- Test on a phone-sized screen and on desktop, in light and dark mode.
- Add or update a test in `test/` when you change the API.
- Never commit anything from `data/`, `.env` files or real member information.

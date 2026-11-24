# OZONOXY

Website of OZONOXY, an ozone treatment and disinfection business in Uzbekistan: equipment catalogue, use cases by industry and articles.

**Live:** https://ozonoxy.com.uz

## Stack

- Next.js 15 (Pages Router, static export), React 19, TypeScript
- Tailwind CSS 4
- Tolgee i18n with four locales: Russian, English, Uzbek (Latin) and Uzbek (Cyrillic)
- GitHub Pages, deployed by GitHub Actions on every push to `main`

## Run locally

```bash
pnpm install
pnpm dev      # http://localhost:3000
pnpm build    # static site in out/, plus the sitemap
```

## Structure

| Path           | What's there                                        |
| -------------- | --------------------------------------------------- |
| `src/pages/`   | Routes, one per page and one per `[lang]` variant   |
| `src/@pages/`  | Page UI                                             |
| `src/widgets/` | Header, footer, layout                              |
| `src/shared/`  | Config, translations, helpers, UI pieces            |
| `scripts/`     | Translation checks and Latin to Cyrillic conversion |

## License

All rights reserved. The code is public to read; the texts, photos and brand belong to OZONOXY.

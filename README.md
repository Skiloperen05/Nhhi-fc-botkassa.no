# NHHI FC Botkassa

Det offisielle bøtesystemet for NHHI FC – tilgjengelig på [nhhi-fc-botkassa.no](https://nhhi-fc-botkassa.no).

## Teknologi

- **Frontend:** React 19 + TypeScript
- **Bygg:** Vite
- **Styling:** Tailwind CSS
- **Backend:** Supabase (sanntidssynkronisering)
- **AI:** Google Gemini

---

## Kom i gang lokalt

**Forutsetning:** Node.js 20+

1. Installer avhengigheter:
   ```bash
   npm install
   ```

2. Kopier miljøvariabel-malen:
   ```bash
   cp .env.example .env.local
   ```

3. Fyll inn nøklene i `.env.local`:
   - `GEMINI_API_KEY` – fra [Google AI Studio](https://aistudio.google.com)
   - `VITE_SUPABASE_URL` – fra Supabase-prosjektets innstillinger
   - `VITE_SUPABASE_KEY` – service role-nøkkel fra Supabase

4. Start utviklingsserveren:
   ```bash
   npm run dev
   ```

---

## Deploy

### GitHub Pages (automatisk via Actions)

Appen deployes automatisk til GitHub Pages ved push til `main`.

**Oppsett (én gang):**

1. Gå til repoets **Settings → Secrets and variables → Actions** og legg til:
   - `GEMINI_API_KEY`
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_KEY`

2. Gå til **Settings → Pages** og velg **GitHub Actions** som kilde.

3. For eget domene: legg til `nhhi-fc-botkassa.no` under **Custom domain** i Pages-innstillingene.

### Vercel

1. Koble GitHub-repoet til Vercel.
2. Legg til miljøvariablene fra `.env.example` i Vercel-prosjektets innstillinger.
3. Vercel bygger og deployer automatisk.

---

## Bygg manuelt

```bash
npm run build
npm run preview
```

Bygget havner i `dist/`-mappen.

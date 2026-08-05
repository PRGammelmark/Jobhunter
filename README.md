# Jobhunter

Dit personlige **AI Career OS** — pipeline-CRM, Knowledge Base, Company Memory, AI-sparringspartner og ansøgningsgenerator.

## Tech stack

- **Frontend:** React, TypeScript, Vite, Material UI (mobile-first)
- **Backend:** Node.js, Express, TypeScript
- **Database:** MongoDB
- **Filer:** Cloudflare R2 (prod) eller lokal disk (dev)
- **AI:** OpenAI API

## Kom i gang

### 1. Installer dependencies

```bash
npm install
```

### 2. Start MongoDB (valgfrit)

Kun nødvendigt hvis du ikke bruger MongoDB Atlas:

```bash
docker compose up -d mongodb
```

### 3. Konfigurer Cloudflare R2 (produktion)

1. Gå til [Cloudflare Dashboard](https://dash.cloudflare.com) → **R2**
2. Opret en bucket (f.eks. `jobhunter`)
3. Opret en **API token** med Object Read & Write
4. Tilføj credentials i `.env`:

```bash
STORAGE_TYPE=r2
R2_ACCOUNT_ID=din_account_id
R2_ACCESS_KEY_ID=din_access_key
R2_SECRET_ACCESS_KEY=din_secret_key
R2_BUCKET_NAME=jobhunter
```

Til lokal udvikling uden R2: behold `STORAGE_TYPE=local` (filer gemmes i `./uploads`).

### 4. Konfigurer miljø

```bash
cp .env.example .env
# Tilføj OPENAI_API_KEY for fuld AI-funktionalitet
```

### 5. Seed Knowledge Base

```bash
npm run seed
```

### 6. Start appen

```bash
npm run dev
```

- Frontend: http://localhost:5173
- API: http://localhost:3001

## Projektstruktur

```
├── client/          # React frontend
├── server/          # Express API
│   └── src/services/ai/
│       ├── JobAnalysisService.ts
│       ├── KnowledgeMatcher.ts
│       ├── CvSelector.ts
│       ├── CoverLetterGenerator.ts
│       ├── InterviewPreparationService.ts
│       └── StatisticsService.ts
├── shared/          # Delte TypeScript-typer
└── docker-compose.yml
```

## Features (implementeret)

- Arbejdsdag-dashboard med pipeline, opgaver og nylige virksomheder
- Pipeline-CRM med 10 statusser
- Job scraping (Jobindex + generisk) med permanent arkivering
- Knowledge Base med confidence, linked entries og STAR-cases
- AI sparringspartner-analyse (multi-match scores, styrker, risici, spørgsmål)
- Ansøgningsgenerator med versionering og potential improvements
- Interview-mode med kontekst (runde, type, format)
- Company Memory
- CV-bibliotek (upload)
- Statistik-side
- **PDF-export** (Markdown → HTML → PDF via Puppeteer)
- **Email-udsendelse** via Gmail/Outlook OAuth med PDF-vedhæftninger

## Email OAuth setup

### Gmail
1. Opret projekt i [Google Cloud Console](https://console.cloud.google.com)
2. Aktiver Gmail API
3. Opret OAuth 2.0 credentials (Web application)
4. Redirect URI: `http://localhost:3001/api/settings/email/callback/google`
5. Tilføj `GOOGLE_CLIENT_ID` og `GOOGLE_CLIENT_SECRET` i `.env`

### Outlook
1. Registrer app i [Azure Portal](https://portal.azure.com) → App registrations
2. Redirect URI: `http://localhost:3001/api/settings/email/callback/microsoft`
3. API permissions: `Mail.Send`, `User.Read`, `offline_access`
4. Tilføj `MICROSOFT_CLIENT_ID` og `MICROSOFT_CLIENT_SECRET` i `.env`

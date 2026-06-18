# 🔮 CodeLore — Living Documentation AI Platform

> Auto-generate always-up-to-date documentation from your GitHub repositories.
> Architecture overviews, setup guides, API references, design decision logs all powered by AI and kept fresh with every commit.

![Node.js](https://img.shields.io/badge/Node.js-20-green)
![Express](https://img.shields.io/badge/Express-4.18-lightgrey)
![React](https://img.shields.io/badge/React-18-61DAFB)
![MongoDB](https://img.shields.io/badge/MongoDB-7-47A248)
![License](https://img.shields.io/badge/License-MIT-violet)

---

## ✨ What CodeLore Does

Connect any GitHub repository and CodeLore will:

1. **Analyze** your entire codebase file structure, languages, dependencies
2. **Read** your git history to understand what changed and why
3. **Generate** living documentation using AI:
   - 🏗️ Architecture Overview with Mermaid diagrams
   - 🚀 Setup & Getting Started guide
   - 📡 API Reference from your route files
   - 🧭 Design Decision Log ("why we chose X over Y")
   - 📖 Project Glossary of domain-specific terms
4. **Keep it fresh**  re-generate on every push (optional)
5. **Share** publicly or keep private

---

## 🏗️ Architecture

```
codelore/
├── backend/                    # Node.js + Express API
│   └── src/
│       ├── config/             # DB, Redis, app config
│       ├── models/             # Mongoose schemas (User, Repository, Documentation)
│       ├── middleware/         # JWT auth, error handling
│       ├── routes/             # /auth, /repos, /docs
│       ├── services/
│       │   ├── githubService.js   # Octokit — repo analysis, OAuth
│       │   ├── aiService.js       # OpenAI — doc generation
│       │   └── analysisService.js # Full analysis pipeline
│       └── jobs/
│           └── analysisQueue.js   # Bull queue for async analysis
├── frontend/                   # React + Vite + Tailwind
│   └── src/
│       ├── pages/              # Dashboard, Repos, Docs, DocView, Explore
│       ├── components/         # Layout, sidebar
│       ├── store/              # Zustand auth store
│       └── lib/api.ts          # Axios client with token refresh
├── docker-compose.yml
└── .github/workflows/ci.yml
```

---

## 🚀 Quick Start

### With Docker (recommended)

```bash
git clone https://github.com/avase33/codelore.git
cd codelore
cp .env.example .env
# Edit .env — add GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, OPENAI_API_KEY
docker compose up -d
```

- **API**: http://localhost:4000
- **Frontend**: http://localhost:5173

### Local Development

**Backend:**
```bash
cd backend
npm install
cp ../.env.example .env   # configure required vars
npm run dev               # nodemon auto-reload on port 4000
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev               # Vite dev server on port 5173
```

### GitHub OAuth Setup

1. Go to https://github.com/settings/applications/new
2. Set **Homepage URL**: `http://localhost:5173`
3. Set **Callback URL**: `http://localhost:4000/api/v1/auth/github/callback`
4. Copy Client ID and Secret into `.env`

---

## 📡 API Reference

### Authentication
```http
POST /api/v1/auth/register        # Email/password signup
POST /api/v1/auth/login           # Login → JWT tokens
POST /api/v1/auth/refresh         # Refresh access token
GET  /api/v1/auth/github          # GitHub OAuth redirect
GET  /api/v1/auth/github/callback # OAuth callback (redirects to frontend)
GET  /api/v1/auth/me              # Current user
PATCH /api/v1/auth/me             # Update profile
```

### Repositories
```http
GET    /api/v1/repos              # List connected repos
GET    /api/v1/repos/github       # List user's GitHub repos
POST   /api/v1/repos              # Connect repo (triggers analysis)
GET    /api/v1/repos/:id          # Repo details + file tree
POST   /api/v1/repos/:id/reanalyze # Re-trigger analysis
PATCH  /api/v1/repos/:id          # Update settings
DELETE /api/v1/repos/:id          # Disconnect repo
```

### Documentation
```http
GET    /api/v1/docs               # List user's docs
GET    /api/v1/docs/public        # Browse public docs
GET    /api/v1/docs/:id           # Get doc with all sections
GET    /api/v1/docs/repo/:repoId  # Get doc for a repo
PATCH  /api/v1/docs/:id           # Edit section / settings
DELETE /api/v1/docs/:id           # Delete documentation
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js 20, Express 4, ES Modules |
| Database | MongoDB 7 (Mongoose ODM) |
| Queue | Bull + Redis 7 (async analysis jobs) |
| Auth | JWT (jsonwebtoken) + bcrypt + GitHub OAuth |
| AI | OpenAI GPT-4o-mini (doc generation) |
| GitHub API | Octokit REST |
| Frontend | React 18, TypeScript, Vite |
| Styling | Tailwind CSS (dark theme, gray-950) |
| State | Zustand + TanStack Query |
| Markdown | react-markdown + remark-gfm |
| Charts | Recharts |
| CI/CD | GitHub Actions + Docker |

---

## 🗺️ Roadmap

- [ ] Webhook integration (auto-regenerate on push)
- [ ] Diff viewer — show what changed in each re-generation
- [ ] Team workspaces and collaboration
- [ ] Custom doc templates
- [ ] Slack/Discord notifications when docs regenerate
- [ ] GitHub App installation (no OAuth required)
- [ ] CLI: `npx codelore generate` for local repos
- [ ] VS Code extension
- [ ] Search across all doc content
- [ ] Export to PDF / Notion / Confluence

---

## 🤝 Contributing

1. Fork the repository
2. `git checkout -b feature/your-feature`
3. `git commit -m 'feat: add your feature'`
4. `git push origin feature/your-feature`
5. Open a Pull Request

---

## 📄 License

MIT License — Copyright (c) 2026 Akhil Vase

See [LICENSE](LICENSE) for full text.

---

Built with ❤️ by [Akhil Vase](https://github.com/avase33)

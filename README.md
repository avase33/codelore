<div align="center">

```
  ___          _      _                  
 / __|___   __| |___ | |   ___  _ _ ___ 
| (__/ _ \ / _` / -_)| |__/ _ \| '_/ -_)
 \___\___/ \__,_\___||____\___/|_| \___|
```

### **Living Documentation for Engineering Teams**

*Documentation that reads your code, not the other way around.*

<br/>

[![CI](https://github.com/avase33/codelore/actions/workflows/ci.yml/badge.svg)](https://github.com/avase33/codelore/actions/workflows/ci.yml)
![Node.js](https://img.shields.io/badge/Node.js-20-339933?logo=node.js&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-ES2022-F7DF1E?logo=javascript&logoColor=black)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)
![License](https://img.shields.io/badge/License-Proprietary-red)

<br/>

> **CodeLore** is an AI-powered documentation platform that stays in sync with your codebase automatically. Connect a repo, and CodeLore parses your code, extracts architecture decisions, maps dependencies, and surfaces knowledge graphs that update with every commit.

</div>

---

## The Problem

Engineering teams waste thousands of hours writing docs that go stale within days of the commit that changes everything. New engineers spend weeks piecing together how the system works. Senior engineers become documentation bottlenecks.

CodeLore inverts this: the code is the source of truth, and documentation is auto-generated from it.

---

## Feature Highlights

### Automated Docs Generation

- Parse any JavaScript, TypeScript, Python, or Java codebase
- Extract API routes, data models, function signatures, and comments
- Generate structured, human-readable documentation automatically
- Detect architectural patterns: MVC, microservices, event-driven, etc.

### Knowledge Graph

- Visual map of how your modules, classes, and functions relate
- Dependency graph: what imports what, what calls what
- Click any node to jump to the generated docs for that component
- Highlights circular dependencies and orphaned code

### Sync on Every Push

- GitHub webhook integration: re-analyzes on every push to main
- Diffs documentation changes alongside code changes
- Preserves manually written overrides across re-generations
- Version history: see how your architecture evolved over time

### Team Collaboration

- Annotate generated docs with team context
- Comment threads on any doc section
- Assign ownership to modules and components
- Search across all documentation with full-text index

---

## Architecture

```
+--------------------------------------------------------------+
|                      CLIENT (Browser)                        |
|  React 18 - JavaScript - Tailwind CSS - Knowledge Graph UI  |
+------------------------+-------------------------------------+
                         |
                         |  REST API  +  WebSocket (live sync)
                         |
+------------------------v-------------------------------------+
|                    BACKEND (Node.js 20)                      |
|  Express 4 - ES Modules                                      |
|                                                              |
|  +-----------+  +----------+  +----------+  +----------+   |
|  |   Parser  |  |   Graph  |  |   Docs   |  |  Webhook |   |
|  |  Service  |  |  Engine  |  | Generator|  | Listener |   |
|  +-----------+  +----------+  +----------+  +----------+   |
+------------------------+-------------------------------------+
                         |
+------------------------v-------------------------------------+
|                      MongoDB 7                               |
|  Repositories - ParsedModules - DocPages - Teams - Comments |
+--------------------------------------------------------------+
```

---

## Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Runtime** | Node.js 20, ES Modules | Backend parsing engine |
| **Framework** | Express 4 | REST API and webhooks |
| **Database** | MongoDB 7, Mongoose | Document and graph storage |
| **Parser** | AST-based code analysis | Language-aware code parsing |
| **Frontend** | React 18, JavaScript | UI and knowledge graph |
| **Styling** | Tailwind CSS | Clean, readable UI |
| **Realtime** | WebSocket | Live doc sync on push |
| **CI** | GitHub Actions | Build and test on push |

---

## Quick Start

### Option A: Docker

```bash
git clone https://github.com/avase33/codelore.git
cd codelore
cp .env.example .env
docker compose up -d
```

| Service | URL |
|---|---|
| App | http://localhost:3000 |
| API | http://localhost:5000/api |

### Option B: Local Development

**Backend**

```bash
cd backend
npm install
cp ../.env.example .env
npm run dev
```

**Frontend**

```bash
cd frontend
npm install
npm run dev
```

---

## How It Works

```
Your Repo (GitHub)
      |
      | push event --> GitHub Webhook
      |
      v
CodeLore Parser
      |
      | AST traversal of every changed file
      | extracts: functions, classes, routes, imports, exports
      |
      v
Knowledge Graph Builder
      | links: caller --> callee, importer --> module
      | detects: patterns, clusters, orphans
      |
      v
Doc Generator
      | produces: human-readable Markdown per module
      | merges: manual annotations from previous runs
      |
      v
MongoDB Storage  -->  React UI  -->  Your Team
```

---

## Roadmap

- [ ] PitchSync integration -- generate pitch slides from docs
- [ ] Slack bot: "What does UserService do?" answered in thread
- [ ] Diff-aware doc updates (only re-gen changed modules)
- [ ] Multi-language support: Go, Rust, C#
- [ ] Notion and Confluence export
- [ ] JIRA ticket auto-linking
- [ ] AI-powered Q&A over your codebase
- [ ] On-premise deployment for enterprise

---

## License

```
Copyright (c) 2026 Akhil Vase. All rights reserved.

This source code is the proprietary property of Akhil Vase.
Unauthorized copying, distribution, or modification is strictly prohibited.
```

---

<div align="center">

**Documentation that lives where your code lives.**

*CodeLore -- Read the code. Know the system.*

</div>

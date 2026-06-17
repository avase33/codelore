@echo off
echo ============================================
echo  CodeLore - GitHub Setup Script
echo ============================================

REM Create GitHub repo via gh CLI
gh repo create codelore --public --description "Living Documentation AI Platform - Node.js + Express + React startup project" --homepage "https://github.com/avase33/codelore"

REM Initialize git
git init
git add .
git commit -m "feat: initial commit - CodeLore Living Documentation Platform

Full-stack AI documentation platform startup project:
- Node.js + Express backend with JWT auth, GitHub OAuth,
  repository analysis pipeline, and AI-powered doc generation
- React + TypeScript frontend with dashboard, repo manager,
  doc viewer with markdown rendering, and public explore page
- MongoDB + Redis + Bull queue for async analysis jobs
- OpenAI GPT-4o-mini for architecture overviews, setup guides,
  API reference, design decision logs, and project glossaries
- Docker Compose for local development
- GitHub Actions CI/CD pipeline
- MIT License - Akhil Vase 2026"

git branch -M main
git remote add origin https://github.com/avase33/codelore.git
git push -u origin main

echo.
echo Done! Visit: https://github.com/avase33/codelore
pause

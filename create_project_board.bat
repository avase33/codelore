@echo off
echo ============================================================
echo  CodeLore - GitHub Project Board Setup
echo ============================================================
echo.

REM Create the project board
echo Creating GitHub Project board...
gh project create --owner avase33 --title "CodeLore Startup Board" --format json > tmp_project.json
if %errorlevel% neq 0 (
    echo ERROR: Could not create project. Make sure you are logged in with: gh auth login
    pause
    exit /b 1
)

for /f "tokens=*" %%a in ('powershell -command "(Get-Content tmp_project.json | ConvertFrom-Json).number"') do set PROJECT_NUMBER=%%a
del tmp_project.json

echo Project #%PROJECT_NUMBER% created!
echo.

echo Creating startup milestone issues...

gh issue create --repo avase33/codelore --title "Setup: MongoDB Atlas production cluster" --body "Provision MongoDB Atlas for production.\n\n**Tasks:**\n- [ ] Create Atlas cluster (M10 minimum)\n- [ ] Configure network access and IP allowlist\n- [ ] Set up database users\n- [ ] Configure connection string in secrets\n- [ ] Enable automated backups\n- [ ] Set up Atlas monitoring alerts" --label "infrastructure,setup" 2>nul

gh issue create --repo avase33/codelore --title "Feature: GitHub App integration (replace OAuth)" --body "Build a GitHub App for better rate limits and no-OAuth repo access.\n\n**Tasks:**\n- [ ] Register GitHub App\n- [ ] Implement installation webhook\n- [ ] Replace Octokit user token with installation token\n- [ ] Handle multi-org installations\n- [ ] Manage token rotation" --label "enhancement,backend" 2>nul

gh issue create --repo avase33/codelore --title "Feature: Webhook — auto-regenerate on push" --body "Listen to GitHub push webhooks to keep docs up to date.\n\n**Tasks:**\n- [ ] POST /api/v1/webhooks/github endpoint\n- [ ] Verify webhook signature (HMAC-SHA256)\n- [ ] Filter push events to default branch\n- [ ] Enqueue incremental re-analysis\n- [ ] Diff sections that changed vs. previous version\n- [ ] Show regeneration timestamp in UI" --label "enhancement,backend" 2>nul

gh issue create --repo avase33/codelore --title "Feature: Diff viewer for doc regenerations" --body "Show what changed between doc versions.\n\n**Tasks:**\n- [ ] Store previous doc versions (3 max)\n- [ ] Unified diff algorithm for section comparison\n- [ ] Diff UI with added/removed highlighting\n- [ ] Version history dropdown in DocView\n- [ ] Rollback to previous version" --label "enhancement,frontend" 2>nul

gh issue create --repo avase33/codelore --title "Feature: Full-text search across documentation" --body "Allow users to search across all their generated docs.\n\n**Tasks:**\n- [ ] MongoDB Atlas Search index on section content\n- [ ] GET /api/v1/docs/search?q= endpoint\n- [ ] Search UI with result highlighting\n- [ ] Filter by repo / section type\n- [ ] Keyboard shortcut (Cmd+K)" --label "enhancement,backend" 2>nul

gh issue create --repo avase33/codelore --title "Feature: Team workspaces and collaboration" --body "Allow teams to share repos and docs.\n\n**Tasks:**\n- [ ] Workspace model (org + members)\n- [ ] Invite by email\n- [ ] Role-based access (owner/editor/viewer)\n- [ ] Shared repo analysis\n- [ ] Activity feed per workspace" --label "enhancement,feature" 2>nul

gh issue create --repo avase33/codelore --title "Infra: Kubernetes Helm chart" --body "Deploy CodeLore on Kubernetes.\n\n**Tasks:**\n- [ ] Helm chart for backend (Node.js)\n- [ ] Helm chart for frontend (nginx)\n- [ ] MongoDB StatefulSet or Atlas external\n- [ ] Redis StatefulSet\n- [ ] Ingress with TLS\n- [ ] HorizontalPodAutoscaler for backend" --label "infrastructure,devops" 2>nul

gh issue create --repo avase33/codelore --title "Feature: CLI — npx codelore generate" --body "Let developers generate docs locally without a GitHub connection.\n\n**Tasks:**\n- [ ] npx codelore init (project setup)\n- [ ] npx codelore generate (analyze local repo)\n- [ ] npx codelore publish (push to CodeLore platform)\n- [ ] Publish to npm\n- [ ] CI/CD integration example (GitHub Actions step)" --label "enhancement,sdk" 2>nul

gh issue create --repo avase33/codelore --title "Feature: Export to PDF / Notion / Confluence" --body "Export generated documentation to external formats.\n\n**Tasks:**\n- [ ] Markdown → PDF (puppeteer)\n- [ ] Notion API integration (page creation)\n- [ ] Confluence REST API integration\n- [ ] Export all sections as ZIP\n- [ ] Schedule automatic exports" --label "enhancement,integration" 2>nul

gh issue create --repo avase33/codelore --title "Security: Rate limiting + abuse prevention" --body "Protect AI generation endpoints from abuse.\n\n**Tasks:**\n- [ ] Per-user daily generation limits (free: 5, pro: unlimited)\n- [ ] Redis-based sliding window rate limiter\n- [ ] Token usage tracking per user\n- [ ] Anomaly detection (burst detection)\n- [ ] Admin dashboard for usage metrics" --label "security,backend" 2>nul

echo.
echo ============================================================
echo  All issues created! Now adding to project board...
echo ============================================================
echo.

for /l %%i in (1,1,10) do (
    gh project item-add %PROJECT_NUMBER% --owner avase33 --url https://github.com/avase33/codelore/issues/%%i 2>nul
)

echo.
echo ============================================================
echo  SUCCESS! Your CodeLore Project Board is ready.
echo.
echo  View it at:
echo  https://github.com/users/avase33/projects/%PROJECT_NUMBER%
echo.
echo  Repository:
echo  https://github.com/avase33/codelore
echo ============================================================
echo.
pause

# Changelog

## [Unreleased]
### Added
- Multi-language parser: Python and Java support
- Webhook retry queue with exponential backoff
- Knowledge graph export to GraphML and JSON-LD
- Full-text search with MongoDB Atlas Search
- Module ownership: assign engineers to components
- Slack bot: query docs with /codelore command

### Changed
- Switched from polling to GitHub webhook push events (10x lower latency)
- Knowledge graph now uses D3.js force-directed layout
- Improved circular dependency detection with Tarjan SCC

### Fixed
- Fixed race condition in concurrent webhook processing
- Fixed import resolution for aliased paths

## [0.1.0] - 2026-06-01
### Added
- JavaScript and TypeScript AST parsing
- GitHub webhook integration for live doc sync
- React knowledge graph UI
- MongoDB document storage
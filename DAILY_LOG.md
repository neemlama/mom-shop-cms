# Daily log - mom-shop-cms

## 2026-09-29
- Init git repo, added .gitignore (ignore node_modules, shop JSON, xlsx reports)
- Fixed server.js buildMonthReport crash: userReportsDir(username) -> shopReportsDir(shop)
- Updated README to match server + stitch-replica (old backend/frontend removed)
- Goal tomorrow: `gh auth login` then push to GitHub, test /api/reports/generate

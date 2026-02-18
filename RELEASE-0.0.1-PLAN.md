# Release 0.0.1 Action Plan

**Target:** First public release (alpha/beta)  
**Timeline:** 4-6 hours  
**Status:** Ready to execute  

---

## 🎯 Release Goals

This is our **first public release** to:
- Get early user feedback
- Validate the platform works end-to-end
- Establish npm package presence
- Test deployment pipeline

**Version Strategy:**
- 0.0.1 = Alpha/Beta (we are here)
- 0.1.0 = Feature complete
- 1.0.0 = Production ready

---

## ✅ Pre-Release Checklist

### Phase 1: Version Updates (15 minutes)
- [ ] Update root `package.json` to 0.0.1
- [ ] Update `packages/sdk/package.json` to 0.0.1
- [ ] Update `apps/ingestion/package.json` to 0.0.1
- [ ] Update `apps/dashboard/package.json` to 0.0.1
- [ ] Update `packages/sdk/CHANGELOG.md` with 0.0.1 entry
- [ ] Create root `CHANGELOG.md` if not exists
- [ ] Commit: `chore: bump version to 0.0.1`

### Phase 2: Test with Real Data (30 minutes)
- [ ] Set up local database with proper connection
- [ ] Start ingestion service locally
- [ ] Create a simple test HTML page with SDK
- [ ] Generate test events:
  - [ ] 50+ pageviews
  - [ ] Multiple referrers
  - [ ] Different paths
  - [ ] Multiple sessions
- [ ] Verify data appears in dashboard
- [ ] Test all filters (date range, localhost)
- [ ] Verify chart renders correctly
- [ ] Check all tables populate
- [ ] Document any issues found

### Phase 3: Dashboard Deployment (45 minutes)
- [ ] Create Vercel account/project (if not exists)
- [ ] Connect GitHub repository to Vercel
- [ ] Configure environment variables in Vercel:
  - [ ] `DATABASE_URL`
  - [ ] `DASHBOARD_USERNAME` (optional)
  - [ ] `DASHBOARD_PASSWORD` (optional)
- [ ] Deploy to production
- [ ] Test deployed dashboard:
  - [ ] Verify it loads
  - [ ] Test authentication
  - [ ] Check database connection
  - [ ] Verify all features work
- [ ] Set up custom domain (optional)
- [ ] Document deployment URL

### Phase 4: SDK Publishing (30 minutes)
- [ ] Navigate to `packages/sdk`
- [ ] Verify build: `bun run build`
- [ ] Check dist files exist
- [ ] Review `package.json` metadata:
  - [ ] Name: @remcostoeten/analytics
  - [ ] Version: 0.0.1
  - [ ] Description accurate
  - [ ] Keywords present
  - [ ] Repository URL correct
  - [ ] License: MIT
- [ ] Test package locally:
  ```bash
  npm pack
  # Install in test project
  npm install ../analytics/packages/sdk/remcostoeten-analytics-0.0.1.tgz
  ```
- [ ] Login to npm: `npm login`
- [ ] Publish: `npm publish --access public`
- [ ] Verify on npmjs.com
- [ ] Test install in fresh project:
  ```bash
  npm install @remcostoeten/analytics
  ```
- [ ] Document any issues

### Phase 5: Documentation Updates (45 minutes)
- [ ] Update main README.md:
  - [ ] Add "Quick Start" section
  - [ ] Add installation instructions
  - [ ] Add dashboard URL (if deployed)
  - [ ] Add screenshots (take 3-4 key screens)
  - [ ] Update status badges
  - [ ] Add 0.0.1 release notes
- [ ] Update SDK README.md:
  - [ ] Installation from npm
  - [ ] Basic usage example
  - [ ] Props/API reference
  - [ ] Link to dashboard
- [ ] Create `DEPLOYMENT.md`:
  - [ ] Vercel deployment steps
  - [ ] Environment variables guide
  - [ ] Neon database setup
  - [ ] Troubleshooting section
- [ ] Update `CURRENT-STATUS.md`:
  - [ ] Mark dashboard as deployed
  - [ ] Mark SDK as published
  - [ ] Update completion percentages

### Phase 6: GitHub Release (20 minutes)
- [ ] Commit all changes
- [ ] Create git tag:
  ```bash
  git tag -a v0.0.1 -m "Release v0.0.1 - First Alpha Release"
  git push origin v0.0.1
  ```
- [ ] Create GitHub Release:
  - [ ] Title: "v0.0.1 - First Alpha Release"
  - [ ] Description with features and known issues
  - [ ] Attach screenshots
  - [ ] Mark as "pre-release"
  - [ ] Publish release

### Phase 7: Final Testing (30 minutes)
- [ ] Install SDK from npm in fresh Next.js app
- [ ] Test basic tracking works
- [ ] Verify events appear in dashboard
- [ ] Test filters work on real data
- [ ] Test on mobile device
- [ ] Test on different browser
- [ ] Document any issues for 0.0.2

---

## 📦 What Gets Published

### npm Package
- **Package:** @remcostoeten/analytics
- **Version:** 0.0.1
- **Size:** ~1.6 KB gzipped
- **Includes:**
  - ESM + CJS bundles
  - TypeScript definitions
  - README

### Vercel Deployment
- **App:** Dashboard
- **URL:** TBD (analytics.yourdomain.com or vercel-app-url)
- **Features:**
  - Full dashboard
  - Authentication (optional)
  - Real-time data

### GitHub Release
- **Tag:** v0.0.1
- **Type:** Pre-release
- **Assets:** Source code (automatic)

---

## 🔧 Environment Setup Needed

### Local Testing
```bash
# apps/ingestion/.env
DATABASE_URL=postgresql://user:pass@host.neon.tech/dbname
IP_HASH_SECRET=your-32-character-secret-here

# apps/dashboard/.env.local
DATABASE_URL=postgresql://user:pass@host.neon.tech/dbname
DASHBOARD_USERNAME=admin
DASHBOARD_PASSWORD=yourpassword
```

### Vercel Production
```bash
# Environment Variables in Vercel Dashboard
DATABASE_URL=postgresql://...
DASHBOARD_USERNAME=admin (optional)
DASHBOARD_PASSWORD=yourpassword (optional)
```

### npm Publishing
```bash
# Need npm account
npm login
# Verify logged in
npm whoami
```

---

## 📸 Screenshots Needed

Take screenshots for documentation:
1. **Dashboard Overview** - Full page with data
2. **Timeseries Chart** - Close-up of chart
3. **Filters in Action** - Show date range selector
4. **Data Tables** - Top pages and referrers visible
5. **Mobile View** - Dashboard on mobile (if responsive)

---

## 📝 Release Notes Template

```markdown
# v0.0.1 - First Alpha Release

## 🎉 What's Included

### Analytics Dashboard
- Real-time analytics dashboard
- Timeseries chart (Recharts)
- Metrics cards (pageviews, visitors, sessions)
- Data tables (top pages, referrers, geo)
- Interactive filters (date range, localhost)
- HTTP Basic Auth (optional)
- Dark theme UI

### SDK Package
- React `<Analytics />` component
- Auto page view tracking
- Custom event tracking
- Visitor & session management
- Privacy controls (opt-out, DNT)
- 1.6 KB gzipped
- TypeScript support

### Ingestion Service
- Event ingestion API
- Geographic data extraction
- IP hashing (privacy-friendly)
- Bot detection (40+ patterns)
- Event deduplication
- Health monitoring

## 📦 Installation

```bash
npm install @remcostoeten/analytics
```

## 🚀 Quick Start

```tsx
import { Analytics } from '@remcostoeten/analytics';

export default function App() {
  return (
    <>
      <Analytics />
      {/* your app */}
    </>
  );
}
```

## 🐛 Known Issues (Alpha)

- Bot traffic filter UI present but not fully functional
- Project selector not implemented (single project only)
- No sorting on data tables yet
- Mobile responsiveness needs more testing
- Custom date range picker not available yet

## 🔜 Coming in 0.0.2

- Bot traffic filtering in queries
- Multi-project support
- Sortable data tables
- Mobile optimizations
- Custom date ranges

## 📊 Stats

- **Tests:** 168 passing
- **Coverage:** 95%
- **Bundle Size:** 1.6 KB (SDK)
- **Performance:** <100ms p95 ingestion

## 🙏 Feedback Welcome

This is an alpha release. Please report issues on GitHub!
```

---

## ⚠️ Known Issues to Document

### Not Critical (Expected for 0.0.1)
1. Bot traffic toggle doesn't filter queries (data in metadata)
2. Project hardcoded to "localhost"
3. Tables not sortable yet
4. No custom date range picker
5. Responsive design needs mobile testing

### May Need Fixing
1. Verify all environment variables work in Vercel
2. Test authentication flow in production
3. Ensure database migrations are up to date
4. Confirm npm package installs correctly

---

## 🎯 Success Criteria for 0.0.1

### Must Work
- [x] Dashboard displays data
- [x] SDK tracks events
- [x] Ingestion accepts events
- [x] Filters change dashboard data
- [x] Authentication protects routes
- [ ] Deployed to Vercel (pending)
- [ ] Published to npm (pending)
- [ ] Tests passing (168/168) ✅

### Nice to Have
- [ ] Mobile responsive (basic working)
- [ ] Custom domain
- [ ] Demo video
- [ ] Blog post

---

## 📋 Step-by-Step Execution

### Start Here:
```bash
# 1. Update versions
cd analytics
# Edit all package.json files to 0.0.1

# 2. Commit version bump
git add -A
git commit -m "chore: bump version to 0.0.1 for first release"
git push origin master

# 3. Test with real data
cd apps/ingestion
bun run dev
# Generate test events

# 4. Check dashboard shows data
cd ../dashboard
bun run dev
# Verify charts and tables populate

# 5. Deploy dashboard to Vercel
# Use Vercel CLI or dashboard

# 6. Publish SDK to npm
cd ../../packages/sdk
bun run build
npm publish --access public

# 7. Create GitHub release
git tag -a v0.0.1 -m "Release v0.0.1"
git push origin v0.0.1
# Create release on GitHub

# 8. Update documentation
# Add screenshots, URLs, release notes

# 9. Test end-to-end
# Install SDK in test app, verify works
```

---

## 🚀 Post-Release Actions

### Immediate
- [ ] Announce on Twitter/LinkedIn
- [ ] Share in relevant communities
- [ ] Monitor for issues
- [ ] Respond to feedback

### This Week
- [ ] Gather user feedback
- [ ] Create issue tracker for bugs
- [ ] Plan 0.0.2 features
- [ ] Write blog post

### Next Week
- [ ] Implement top requested features
- [ ] Fix critical bugs
- [ ] Improve documentation
- [ ] Plan 0.1.0 release

---

## 📞 Support Plan

### Where to Get Help
- GitHub Issues (primary)
- GitHub Discussions
- Email: [your email]
- Twitter: [@your_handle]

### What to Monitor
- npm download stats
- GitHub stars/forks
- Issue reports
- User questions
- Performance metrics

---

## 🎉 Release Day Checklist

**Morning:**
- [ ] Review all changes one last time
- [ ] Run full test suite
- [ ] Update all version numbers
- [ ] Commit and push

**Afternoon:**
- [ ] Deploy dashboard
- [ ] Publish SDK to npm
- [ ] Create GitHub release
- [ ] Update documentation

**Evening:**
- [ ] Announce release
- [ ] Monitor for issues
- [ ] Respond to feedback
- [ ] Celebrate! 🎊

---

## 🎯 Timeline Summary

| Task | Time | Priority |
|------|------|----------|
| Version updates | 15 min | 🔴 Critical |
| Test with real data | 30 min | 🔴 Critical |
| Deploy dashboard | 45 min | 🔴 Critical |
| Publish SDK | 30 min | 🔴 Critical |
| Update docs | 45 min | 🟠 High |
| GitHub release | 20 min | 🟠 High |
| Final testing | 30 min | 🟡 Medium |
| **Total** | **~4 hours** | |

---

**Ready to ship 0.0.1?** Let's do this! 🚀

**Next Command:** Start with version updates in all package.json files.
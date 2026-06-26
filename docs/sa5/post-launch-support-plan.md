# SA-5.7 — Post-Launch Support Plan

## First 90 Days After Launch

---

## Support Phases

| Phase | Period | Focus | Goal |
|---|---|---|---|
| 1 | Days 1-7 | Launch Week | Zero critical bugs, smooth onboarding |
| 2 | Days 8-30 | Stabilization | Fix issues, optimize performance, add FR/RW |
| 3 | Days 31-90 | Growth | Scale users, add content, improve engagement |

---

## 1. Support Model

### Team Structure

| Role | Responsibilities | Availability |
|---|---|---|
| Product Owner | Launch decisions, feature priorities, stakeholder updates | Business hours |
| Technical Lead | Bug fixes, deploys, infrastructure, monitoring | On-call Days 1-7, then business hours |
| Content Manager | Story publishing, media uploads, translations, challenges | Business hours |
| Community Moderator | Post approvals, reports, content safety | 2x daily review |
| Support Representative | Parent inquiries, issue triage, feedback collection | Business hours |

### Phase 1 (Launch Week) — Enhanced Coverage

| Day | Morning Check | Midday Check | Evening Check |
|---|---|---|---|
| Day 1 | All hands monitoring | Error review | Engagement report |
| Day 2 | Bug triage | Performance check | User feedback review |
| Day 3 | Stability assessment | Content check | Community review |
| Days 4-7 | Daily morning standup | Async monitoring | Daily summary |

### Phase 2 (Stabilization) — Normal Operations

- Daily: 15-min morning check (errors, moderation queue, key metrics)
- Weekly: 30-min team review (analytics, feedback, priorities)
- Monthly: 1-hour planning session (next content, features)

### Phase 3 (Growth) — Optimized Operations

- Daily: automated monitoring alerts only
- Weekly: analytics review + content planning
- Bi-weekly: sprint planning for improvements
- Monthly: executive review with KPIs

---

## 2. Incident Management Framework

### Severity Levels

| Level | Definition | Response | Resolution | Communication |
|---|---|---|---|---|
| Critical | Platform down, data loss, security breach | 15 min | 2 hours | Immediate to all stakeholders |
| High | Feature broken for all users, content error visible | 1 hour | 8 hours | Same day to team |
| Medium | Feature degraded, non-blocking bug | 4 hours | 48 hours | Next standup |
| Low | Cosmetic, minor UX issue | Next business day | 1 week | Sprint backlog |

### Incident Response Process

```
1. DETECT
   Automated: Sentry alert, health check failure
   Manual: User report, team observation
   
2. ASSESS (5 minutes)
   What's affected?
   How many users?
   Is data at risk?
   Assign severity level
   
3. ESCALATE
   Critical → Tech Lead + Product Owner immediately
   High → Tech Lead within 1 hour
   Medium → Log in bug tracker, assign owner
   Low → Add to sprint backlog
   
4. RESOLVE
   Tech Lead diagnoses and fixes
   Deploy via Vercel (instant rollback available)
   
5. VERIFY
   Test fix on production
   Confirm with reporter
   Monitor for recurrence (24 hours)
   
6. COMMUNICATE
   Critical/High → Parent notification if data affected
   Update team channel with resolution
   
7. POSTMORTEM (Critical/High only, within 48 hours)
   Root cause
   Timeline
   Impact
   Prevention measures
```

### Common Incidents

| Incident | Severity | Playbook |
|---|---|---|
| Platform fully down | Critical | Check Supabase status → check Vercel → restore or wait |
| Story content broken | High | Unpublish via admin → fix content → republish |
| Certificate not awarded | High | Check RPC logs → manual award if needed → fix root cause |
| Media not loading | Medium | Check storage → verify URLs → re-upload if needed |
| Notification not sent | Medium | Check push subscriptions → verify notification table → retry |
| AI giving wrong response | Medium | Disable Talk to Nimi → review prompts → re-enable |
| Community inappropriate post | High | Remove immediately → review moderation queue → contact parent |
| Login not working | Critical | Check Supabase Auth → check session handling → escalate |

---

## 3. Community Operations Plan

### Daily Moderation

| Task | Frequency | SLA | Owner |
|---|---|---|---|
| Review moderation queue | 2x per day (morning + evening) | < 12 hours per post | Community Mod |
| Review reported content | Same day | < 4 hours | Community Mod |
| Respond to parent concerns | Business hours | < 24 hours | Support Rep |

### Moderation Decisions

| Content Type | Approve | Reject | Escalate |
|---|---|---|---|
| Challenge completion share | If appropriate | If contains personal info | If unclear content |
| Certificate share | Always approve | — | — |
| Photo upload | If child-safe, no faces visible | If shows identifying info | If borderline |
| Parent comment | If positive/neutral | If negative/harmful | If complaint |

### Appeals Process

```
Parent disagrees with moderation decision
  ↓
Parent contacts support
  ↓
Support reviews original decision
  ↓
If overturn warranted → re-approve content
If decision correct → explain to parent
  ↓
Log decision for pattern tracking
```

### Safety Escalation

| Trigger | Action | Owner |
|---|---|---|
| Child safety concern | Immediately remove content, notify Product Owner | Community Mod |
| Repeated policy violations | Warn parent, escalate if continues | Support + Product Owner |
| Legal/compliance concern | Remove content, consult legal | Product Owner |

---

## 4. Content Operations Plan

### Publishing Workflow

```
Content Manager creates/edits story
  ↓
Runs Readiness Check (SA-3.2) → must reach 100%
  ↓
Submits for review (status = 'review')
  ↓
Product Owner reviews in Preview Mode
  ↓
Product Owner approves → Content Manager publishes
  ↓
Validator (SA-3.6) runs automatically
  ↓
Story appears in learner library
```

### Content Update SLAs

| Change Type | Process | SLA |
|---|---|---|
| Fix typo in story text | Edit in admin → save | Same day |
| Replace audio file | Upload new via Story Editor | Same day |
| Add new language version | Create version → translate → record → publish | 1-2 weeks |
| Add new story | Full production pipeline | 2-4 weeks |
| Emergency content removal | Unpublish in admin | < 5 minutes |

### Translation Workflow

```
EN content finalized
  ↓
Export text for translation (page text, titles, descriptions)
  ↓
FR translator works (3-4 days per story)
  ↓
RW translator works (3-4 days per story)
  ↓
Review translations with native speakers
  ↓
Record audio narration per language
  ↓
Upload via admin CMS (bulk import)
  ↓
Publish language version
```

### Challenge Rotation

| Week | Action |
|---|---|
| Monday | Review previous week's challenge performance |
| Tuesday | Prepare new challenge content (if rotating) |
| Wednesday | Publish new weekly challenge |
| Thursday-Sunday | Monitor participation |

---

## 5. AI Operations Plan

### Weekly AI Review

| Check | What to Verify |
|---|---|
| Usage volume | Conversations per day, messages per session |
| Error rate | % of failed responses |
| Cost tracking | API spend vs budget |
| Safety scan | Sample 10 random conversations for appropriateness |
| Fallback triggers | How often does the fallback message show? |

### Monthly AI Cost Review

| Phase | Expected Users | Est. Monthly Cost | Budget |
|---|---|---|---|
| Phase 1 (20 pilot) | 20 | ~$6 | $20 |
| Phase 2 (100 users) | 100 | ~$30 | $50 |
| Phase 3 (1,000 users) | 1,000 | ~$300 | $500 |

### Cost Control Measures

| Measure | When to Activate |
|---|---|
| Rate limit (10 messages/child/day) | Always active |
| Use Haiku for simple greetings | Phase 2+ |
| Cache common responses | Phase 2+ |
| Disable Talk to Nimi temporarily | If cost exceeds 2x budget |

### Prompt Update Process

```
Issue identified (safety, quality, relevance)
  ↓
Tech Lead drafts prompt update
  ↓
Test in preview/staging
  ↓
Product Owner approves
  ↓
Deploy prompt change
  ↓
Monitor for 48 hours
```

---

## 6. KPI Framework

### Daily Metrics (automated dashboard)

| KPI | Target (Phase 1) | Target (Phase 2) | Target (Phase 3) |
|---|---|---|---|
| DAU | 10+ | 30+ | 100+ |
| Stories started | 5+ | 15+ | 50+ |
| Missions completed | 20+ | 60+ | 200+ |
| Certificates awarded | 1+ | 5+ | 15+ |
| Challenges completed | 3+ | 10+ | 30+ |
| Error rate | < 1% | < 1% | < 0.5% |
| Page load P95 | < 3s | < 3s | < 2.5s |

### Weekly Metrics (team review)

| KPI | Target |
|---|---|
| WAU (Weekly Active Users) | Growing week-over-week |
| Story completion rate | > 30% |
| Challenge participation | > 25% |
| Community posts | Growing |
| Parent dashboard visits | > 50% of parents weekly |
| Moderation queue SLA | < 12 hours |

### Monthly Metrics (executive review)

| KPI | Target |
|---|---|
| Total registered families | Growing |
| Retention (Day 7) | > 40% |
| Retention (Day 30) | > 25% |
| Stories completed per child | > 1 per month |
| Language adoption (multi-lang) | > 15% of children |
| NPS (parent survey) | > 40 |

---

## 7. Growth Plan

### Month 1: Optimize

| Week | Focus |
|---|---|
| Week 1-2 | Fix launch bugs, respond to feedback |
| Week 3 | Add FR/RW translations for all 4 stories |
| Week 4 | Optimize based on analytics (which missions are skipped?) |

**Content goal:** 4 stories fully localized in 3 languages.

### Month 2: Expand

| Week | Focus |
|---|---|
| Week 5-6 | Create Story 5 + Story 6 (new content) |
| Week 7 | New challenge types based on parent feedback |
| Week 8 | Performance optimization if user growth demands |

**Content goal:** 6 stories available, new challenge rotation.

### Month 3: Scale

| Week | Focus |
|---|---|
| Week 9-10 | Create Stories 7-8, begin school pilot program |
| Week 11 | Parent analytics improvements based on feedback |
| Week 12 | Plan Nimipiko 2.0 features |

**Content goal:** 8 stories, established content pipeline producing 2 stories/month.

### Content Production Velocity Target

| Month | Stories Published | Stories In Production |
|---|---|---|
| Month 1 | 4 (launch) | 2 new |
| Month 2 | 6 | 2 new |
| Month 3 | 8 | 2 new |
| Month 6 | 14 | 2/month pipeline |
| Month 12 | 26 | 2/month pipeline |

---

## 8. 90-Day Success Criteria

### Quantitative Targets

| Metric | Day 30 | Day 60 | Day 90 |
|---|---|---|---|
| Registered families | 50 | 150 | 400 |
| Active children (WAU) | 30 | 80 | 200 |
| Stories available | 4 | 6 | 8 |
| Languages complete | 1 (EN) | 3 (EN+FR+RW) | 3 |
| Certificates awarded | 20 | 100 | 400 |
| Weekly challenges run | 4 | 8 | 12 |
| Community posts | 10 | 50 | 200 |
| Day-7 retention | > 35% | > 40% | > 45% |
| Day-30 retention | — | > 20% | > 25% |
| Critical incidents | 0 | 0 | 0 |
| Uptime | > 99% | > 99.5% | > 99.5% |

### Qualitative Targets

| Target | Measure |
|---|---|
| Parents find dashboard useful | > 70% visit weekly |
| Children complete stories | > 30% completion rate |
| Content team can publish independently | No developer needed for routine content |
| Community is safe and active | Zero safety incidents, growing post count |
| Talk to Nimi is safe | Zero inappropriate responses reported |
| Support is responsive | < 24 hour response for all inquiries |

### 90-Day Review Questions

1. Are children coming back? (retention)
2. Are parents engaged? (dashboard usage)
3. Is the content pipeline working? (2 stories/month)
4. Is the platform stable? (uptime, error rate)
5. Are we growing? (new registrations trend)
6. Is the community safe? (moderation effectiveness)
7. Are we ready for 1,000 users? (infrastructure check)

---

## Risk Management

### Technical Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Supabase outage | Low | Critical | Monitor status, PITR backups |
| Performance degradation at scale | Medium | High | Pre-computed views, CDN (SA-5.2) |
| Service worker stale cache | Medium | Medium | No JS chunk caching, version bumps |
| AI cost overrun | Low | Medium | Rate limits, model tiering |

### Content Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Translation quality issues | Medium | Medium | Native speaker review before publishing |
| Audio recording delays | High | Medium | Book talent 2 weeks ahead |
| Illustration delays | Medium | High | Start illustrations first (longest lead) |
| Content not engaging | Medium | High | Monitor completion rates, iterate |

### Operational Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Community moderation overload | Low (at launch scale) | Medium | Automated flagging, clear policies |
| Support volume spike | Medium | Low | FAQ page, in-app help, templates |
| Team member unavailable | Medium | Medium | Cross-training, documented procedures |
| Stakeholder expectation mismatch | Medium | Medium | Weekly reports, clear KPI targets |

### Financial Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Infrastructure costs exceed budget | Low | Low | Start on Pro plan ($45/mo), scale as needed |
| AI costs exceed budget | Low | Medium | Hard rate limits, Haiku for simple queries |
| Content production costs exceed budget | Medium | Medium | Prioritize EN, add languages incrementally |

---

## Feedback Collection

### Channels

| Source | Method | Frequency | Owner |
|---|---|---|---|
| Parents | In-app survey (after Day 7) | Once per user | Product Owner |
| Parents | Monthly email survey | Monthly | Support |
| Children | Observe completion patterns | Continuous | Analytics |
| Content team | Weekly retro | Weekly | Content Manager |
| Support team | Issue pattern analysis | Weekly | Support Rep |
| Community moderator | Moderation report | Weekly | Community Mod |

### Feedback Prioritization

```
User feedback received
  ↓
Categorize: Bug / Feature Request / Content / UX
  ↓
Score: Impact (1-5) × Frequency (1-5) = Priority
  ↓
Priority > 15 → Add to current sprint
Priority 10-15 → Add to next sprint
Priority < 10 → Backlog
  ↓
Communicate decision to requester
```

### Parent Survey Questions (Day 7)

1. How easy was it to set up your child's profile? (1-5)
2. Does your child enjoy the stories? (1-5)
3. How often does your child use Nimipiko? (daily/few times/weekly/rarely)
4. What does your child enjoy most? (FlipFlop/Coloring/Singing/Moving/Videos)
5. What would you improve? (open text)
6. Would you recommend Nimipiko to another parent? (1-10 NPS)

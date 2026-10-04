# 4KILLO Research Grounding (Rule 01 — ScholarXIV)

## Purpose of This Document

This document records how 4KILLO uses academic evidence to ground its product decisions.
ScholarXIV is used as the research discovery layer for this project — helping the team
identify peer-reviewed work on labor-market search, information friction, and employment
matching in Ethiopia and similar urban settings.

All product claims below are clearly separated from research findings. No paper is cited
as proving something it did not directly measure.

---

## Research Layer — Career Insights & Research Drawer

The Mini App embeds a "Career Insights & Research" section in the Settings tab. Each
card follows a consistent structure:

  Research Finding → What it tells us → What 4KILLO builds or tests in response

This structure ensures we present academic evidence honestly, without overstating it.

---

## Insight 1: Reducing Job-Search Costs Improves Employment Outcomes

### Verified Source
**Franklin, S. (2018)**
*Location, Search Costs and Youth Unemployment: Experimental Evidence from Transport Subsidies*
Centre for the Study of African Economies (CSAE) / University of Oxford
Available on Simon Franklin's research page and indexed on ScholarXIV.

### What the Paper Actually Found
A randomized experiment with unemployed youth in Addis Ababa showed that subsidizing
transport costs — reducing the physical cost of searching for work — increased job-search
intensity and improved the likelihood of finding stable employment.

### What It Does NOT Claim
The paper studied physical transport costs, not digital platform design. It does not
directly measure the effect of aggregating online job listings.

### Relevance to 4KILLO
4KILLO addresses a different but analogous type of search cost: the time and cognitive
effort required to discover, monitor, and filter fragmented job opportunities scattered
across dozens of public Telegram channels. The paper gives us strong academic grounding
for the general principle that *lowering search costs improves job-seeker outcomes*. We
are building a product that tests whether reducing digital search costs produces similar
benefits.

### Product Response
- Aggregate public job posts from multiple Telegram channels into one feed.
- Eliminate duplicate listings so users are not wasting time reviewing the same vacancy.
- Surface the direct application contact immediately, removing extra navigation steps.

---

## Insight 2: Urban Job-Search in Ethiopia Is Constrained by Distance and Exclusion

### Verified Source
**Abebe, G., Caria, A.S., Fafchamps, M., Falco, P., Franklin, S., & Quinn, S. (2021)**
*Anonymity or Distance? Job Search and Labour Market Exclusion in a Growing African City*
Review of Economic Studies, Volume 88, Issue 3.
Available via Simon Franklin's research page.

### What the Paper Actually Found
A large-scale experiment in Addis Ababa found that labour market exclusion among young
job seekers is partly explained by limited reach — they could not easily discover
opportunities outside their immediate social and geographic network. Providing broader
access to employer connections improved matching.

### What It Does NOT Claim
The paper does not study Telegram channels, duplicate job posts, or bot redirects.

### Relevance to 4KILLO
Many Ethiopian job seekers only know and monitor the 2–3 Telegram channels their
contacts shared with them. They are unaware of the full landscape of channels posting
relevant opportunities. This is an information reach problem: the same phenomenon the
paper documented in physical networks now exists in digital information networks.

### Product Response
- Index a large number of public job channels, including niche and regional ones.
- Allow administrators to dynamically add new channels so the indexed set grows over time.
- Show users jobs from sources they would not have found independently.

---

## ScholarXIV Integration Plan

1. **Collection:** The team publishes a public collection on [scholarxiv.com](https://scholarxiv.com)
   titled *Job Search, Information Friction, and Labor Market Exclusion in Urban Ethiopia*
   containing the two verified sources above plus any additional papers discovered during
   the hackathon period.

2. **Mini App Drawer:** The Career Insights & Research drawer in the Settings tab links
   directly to this public collection and renders each insight card using the structure
   above: Finding → Relevance → Product Response.

3. **README:** The public GitHub repository links to both the ScholarXIV collection and
   this document.

4. **Architecture Safety:** All drawer content is embedded statically in the frontend.
   The core scraping, matching, and deduplication services have zero runtime dependency
   on ScholarXIV server availability.

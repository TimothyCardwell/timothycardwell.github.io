# Portfolio Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Hugo/Themefisher build output with a hand-written single-page site. It positions Tim Cardwell for executive search as a director-level leader who scales enterprise product and engineering with AI.

**Architecture:** The site is one `index.html` with semantic sections, one `styles.css` (color tokens on `:root`, dark mode via `prefers-color-scheme`) and one small `main.js` (scroll reveal and active nav link). There is no build step. A dev-only Playwright check suite (`tests/`) serves the repo from a tiny Node static server and asserts structure, layout, contrast and resilience. It also writes screenshots to `shots/` for Tim to review before deploy.

**Tech Stack:** HTML, CSS and vanilla JS for the site. Node 24 with `playwright` (devDependency only) for checks and for rendering the social card.

**Spec:** `docs/superpowers/specs/2026-09-26-portfolio-redesign-design.md`

## Global Constraints

- There are no runtime dependencies, external requests, web fonts, frameworks or build step. The site must work by opening files served statically.
- Hosting is GitHub Pages. `CNAME` must remain exactly `www.timcardwell.com`.
- The canonical URL is `https://www.timcardwell.com/`.
- Contact email is `timothy.cardwell@gmail.com`. LinkedIn is `https://www.linkedin.com/in/tim-cardwell/`. GitHub is `https://github.com/TimothyCardwell`.
- No phone number, no `tel:` links, no map, no contact form and no analytics.
- Only use facts from the resume or from Tim's statements. The AI-engineering speed claim stays qualitative ("significantly faster").
- Accent color is deep green. Text contrast must be at least 4.5:1 in both light and dark themes.
- Content must be fully visible with JS disabled, when `main.js` fails to load, and under `prefers-reduced-motion: reduce`.
- No horizontal scroll at a 390px viewport width.
- Never push to `master` without Tim's explicit approval. Work on branch `redesign`.

## Review Focus

1. **`main.js` fails to load or JS is disabled.** All content must still be visible, with no element stuck at `opacity: 0`. Tested in Task 3 (`03-layout.cjs`, "resilience").
2. **Nav anchor lands under the sticky header.** On a phone the header wraps to two lines, and after clicking Approach, Experience or Contact the section heading must not be covered. Tested in Task 3 ("anchor offset").
3. **Horizontal overflow at 390px.** The long email address, the proof figures or the nav must not cause sideways scroll. Tested in Task 3 ("no horizontal scroll").
4. **Dark-mode contrast of muted and accent text.** Every text style must meet 4.5:1 in both schemes. Tested in Task 3 ("contrast").
5. **Resume download 404s on Pages.** Paths are case-sensitive, so the linked `resume.pdf` must exist at exactly that path and be served as a PDF. Tested in Task 2 ("resume").

---

## File Map

| Path | Responsibility | Task |
|---|---|---|
| `package.json`, `package-lock.json` | Dev-only Playwright dependency and npm scripts | 1 |
| `.gitignore` | Ignore `node_modules/` and `shots/` | 1 |
| `tests/run.cjs` | Static server, browser launch, check registry and reporting | 1 |
| `tests/checks/01-repo.cjs` | Legacy files removed, `CNAME` intact | 1 |
| `tests/checks/02-content.cjs` | Head tags, content, links, resume, no phone | 2 |
| `tests/checks/03-layout.cjs` | Viewports, themes, overflow, contrast, anchors, motion resilience, screenshots | 3 |
| `tests/checks/04-social.cjs` | OG image exists at 1200×630 | 4 |
| `index.html` | All page content | 2 |
| `favicon.svg`, `resume.pdf`, `robots.txt`, `sitemap.xml` | Static assets | 2 |
| `styles.css` | All presentation | 3 |
| `main.js` | Scroll reveal and active nav link | 3 |
| `tools/og-card.html`, `tools/make-og.cjs` | Render `images/og.jpg` | 4 |
| `README.md` | How to preview, check and deploy | 4 |

---

### Task 1: Dev harness and legacy removal

**Files:**
- Create: `package.json`, `.gitignore`, `tests/run.cjs`, `tests/checks/01-repo.cjs`
- Delete: `plugins/`, `php/`, `css/`, `js/`, `author/`, `categories/`, `tags/`, `index.xml`, `sitemap.xml`, `index.html`, and every file in `images/` except `images/tim.jpg`

**Interfaces:**
- Produces: `npm run check [filter]`, which runs every `tests/checks/*.cjs` (or only files whose name contains `filter`) and exits 1 on any failure.
- Each check module is `module.exports = async ({ browser, baseURL, root, check }) => {}`, where:
  - `browser` is a Playwright `Browser`.
  - `baseURL` is `http://127.0.0.1:<port>/`.
  - `root` is the absolute repo path.
  - `check(name: string, ok: boolean, detail?: string)` records a pass or fail.

- [ ] **Step 1: Install Playwright as a dev dependency**

```bash
cd /home/tim/git/timothycardwell.github.io
npm init -y >/dev/null
npm install --save-dev playwright
npx playwright install chromium
```

Then replace `package.json` with the following. Keep the `devDependencies.playwright` version that npm wrote, shown here as `<installed>`, and copy it exactly.

```json
{
  "name": "timcardwell-site",
  "private": true,
  "description": "Dev tooling for www.timcardwell.com. The site itself has no dependencies.",
  "scripts": {
    "serve": "python3 -m http.server 8000",
    "check": "node tests/run.cjs",
    "og": "node tools/make-og.cjs"
  },
  "devDependencies": {
    "playwright": "<installed>"
  }
}
```

- [ ] **Step 2: Create `.gitignore`**

```
node_modules/
shots/
```

- [ ] **Step 3: Create `tests/run.cjs`**

```js
// Dev-only check runner: serves the repo, loads it in Chromium, runs tests/checks/*.cjs.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.svg': 'image/svg+xml',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.pdf': 'application/pdf',
  '.xml': 'application/xml',
  '.txt': 'text/plain',
};

function serve() {
  const server = http.createServer((req, res) => {
    let rel = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (rel.endsWith('/')) rel += 'index.html';
    const file = path.join(ROOT, rel);
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404);
      res.end('not found');
      return;
    }
    res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}

async function main() {
  const filter = process.argv[2];
  const dir = path.join(__dirname, 'checks');
  const files = fs.readdirSync(dir)
    .filter((f) => f.endsWith('.cjs') && (!filter || f.includes(filter)))
    .sort();

  const server = await serve();
  const baseURL = `http://127.0.0.1:${server.address().port}/`;
  const browser = await chromium.launch();
  const failures = [];
  let passed = 0;
  const check = (name, ok, detail = '') => {
    if (ok) passed++;
    else failures.push(detail ? `${name}: ${detail}` : name);
  };

  for (const file of files) {
    try {
      await require(path.join(dir, file))({ browser, baseURL, root: ROOT, check });
    } catch (err) {
      failures.push(`${file} threw: ${err.message}`);
    }
  }

  await browser.close();
  server.close();
  console.log(`${passed} passed, ${failures.length} failed`);
  for (const f of failures) console.log(`FAIL ${f}`);
  process.exit(failures.length ? 1 : 0);
}

main();
```

- [ ] **Step 4: Write the failing repo check, `tests/checks/01-repo.cjs`**

```js
const fs = require('node:fs');
const path = require('node:path');

module.exports = async ({ root, check }) => {
  const legacy = ['plugins', 'php', 'css', 'js', 'author', 'categories', 'tags', 'index.xml'];
  for (const p of legacy) {
    check(`repo: legacy ${p} removed`, !fs.existsSync(path.join(root, p)));
  }

  const images = fs.readdirSync(path.join(root, 'images')).sort();
  const allowed = ['og.jpg', 'tim.jpg'];
  check('repo: images/ holds only tim.jpg and og.jpg',
    images.every((f) => allowed.includes(f)), images.join(', '));

  const cname = fs.readFileSync(path.join(root, 'CNAME'), 'utf8').trim();
  check('repo: CNAME is www.timcardwell.com', cname === 'www.timcardwell.com', cname);
};
```

- [ ] **Step 5: Run it to verify it fails**

Run: `npm run check 01`
Expected: FAIL. Lines appear for `plugins`, `php`, `css`, `js`, `author`, `categories`, `tags`, `index.xml` and `images/`. The `CNAME` check passes.

- [ ] **Step 6: Delete the legacy files**

```bash
git rm -r -q plugins php css js author categories tags index.xml sitemap.xml index.html \
  images/about images/backgrounds images/blog images/logos images/portfolio images/slider \
  images/team images/header-bg.jpg images/logo.png
```

- [ ] **Step 7: Run it to verify it passes**

Run: `npm run check 01`
Expected: `10 passed, 0 failed`

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "chore: remove Hugo/Themefisher output and add Playwright check harness"
```

---

### Task 2: Page content and static assets

**Files:**
- Create: `index.html`, `favicon.svg`, `resume.pdf`, `robots.txt`, `sitemap.xml`, `tests/checks/02-content.cjs`

**Interfaces:**
- Consumes: the `check` module contract from Task 1.
- Produces the class and id hooks that Task 3 styles and tests. Use these exact names:
  - Ids: `#main`, `#top`, `#approach`, `#experience`, `#contact`.
  - Header and nav: `.skip-link`, `.site-header`, `.header-inner`, `.wordmark`, `.nav-list`.
  - Hero: `.hero`, `.hero-text`, `.eyebrow`, `.lede`, `.hero-sub`, `.actions`, `.btn`, `.btn-primary`, `.portrait`.
  - Proof strip: `.proof`, `.proof-list`, `.proof-item`, `.proof-figure`, `.proof-label`.
  - Sections: `.section`, `.section-intro`, `.wrap`.
  - Approach: `.pillars`, `.pillar`, `.pillar-kicker`, `.tags`.
  - Experience: `.timeline`, `.role`, `.role-dates`, `.role-title`, `.role-org`, `.education`.
  - Capabilities and contact: `.capabilities`, `.contact-email`, `.contact-links`, `.site-footer`.
  - `.reveal` marks elements that animate in.

- [ ] **Step 1: Write the failing content check, `tests/checks/02-content.cjs`**

```js
const fs = require('node:fs');
const path = require('node:path');

module.exports = async ({ browser, baseURL, root, check }) => {
  for (const f of ['index.html', 'favicon.svg', 'resume.pdf', 'robots.txt', 'sitemap.xml']) {
    check(`content: ${f} exists`, fs.existsSync(path.join(root, f)));
  }
  const sitemap = fs.existsSync(path.join(root, 'sitemap.xml'))
    ? fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8') : '';
  check('content: sitemap uses absolute URL', sitemap.includes('<loc>https://www.timcardwell.com/</loc>'));

  const page = await browser.newPage();
  const res = await page.goto(baseURL);
  check('content: index loads', res && res.ok(), res && String(res.status()));

  const html = await page.content();
  const text = await page.locator('body').innerText();
  const attr = (sel, name) => page.locator(sel).first().getAttribute(name).catch(() => null);

  check('content: title names Tim', (await page.title()).includes('Tim Cardwell'));
  check('content: meta description', ((await attr('meta[name="description"]', 'content')) || '').length > 50);
  check('content: canonical', (await attr('link[rel="canonical"]', 'href')) === 'https://www.timcardwell.com/');
  check('content: og:image absolute',
    ((await attr('meta[property="og:image"]', 'content')) || '').startsWith('https://www.timcardwell.com/images/og.jpg'));
  check('content: twitter card', (await attr('meta[name="twitter:card"]', 'content')) === 'summary_large_image');
  check('content: favicon link', (await attr('link[rel="icon"]', 'href')) === 'favicon.svg');

  const h1s = await page.locator('h1').allInnerTexts();
  check('content: exactly one h1 "Tim Cardwell"', h1s.length === 1 && h1s[0].trim() === 'Tim Cardwell', h1s.join('|'));
  check('content: positioning line', text.includes('I help enterprises scale product and engineering with AI.'));
  check('content: 4 proof items', (await page.locator('.proof-item').count()) === 4);
  check('content: 2 pillars', (await page.locator('.pillar').count()) === 2);
  check('content: 4 roles', (await page.locator('.role').count()) === 4);
  for (const org of ['Keller Postman', 'Seismic', 'Donnelley Financial Solutions', 'Echelon Consulting']) {
    check(`content: role ${org}`, text.includes(org));
  }

  const hashes = await page.locator('a[href^="#"]').evaluateAll((as) => as.map((a) => a.getAttribute('href')));
  for (const h of new Set(hashes)) {
    check(`content: anchor ${h} has a target`, (await page.locator(h).count()) === 1);
  }

  // Review Focus 5: the resume link must resolve, be case-exact and be served as a PDF.
  const resume = page.locator('a[href="resume.pdf"][download]');
  check('content: resume download link', (await resume.count()) >= 1);
  const pdf = await page.request.get(new URL('resume.pdf', baseURL).href);
  check('content: resume.pdf is 200 PDF',
    pdf.status() === 200 && (pdf.headers()['content-type'] || '').includes('pdf'), String(pdf.status()));

  check('content: email link', (await page.locator('a[href="mailto:timothy.cardwell@gmail.com"]').count()) >= 1);
  check('content: LinkedIn link', (await page.locator('a[href="https://www.linkedin.com/in/tim-cardwell/"]').count()) >= 1);
  check('content: GitHub link', (await page.locator('a[href="https://github.com/TimothyCardwell"]').count()) >= 1);

  check('content: no phone number', !/\(?217\)?[-.\s]?390[-.\s]?0045/.test(text));
  check('content: no tel: links', (await page.locator('a[href^="tel:"]').count()) === 0);
  for (const leftover of ['Themefisher', 'Meghna', 'googleapis', 'google-analytics', 'jquery']) {
    check(`content: no "${leftover}"`, !html.toLowerCase().includes(leftover.toLowerCase()));
  }

  const alts = await page.locator('img').evaluateAll((imgs) => imgs.map((i) => i.getAttribute('alt') || ''));
  check('content: every img has alt', alts.every((a) => a.trim().length > 0), alts.join('|'));

  await page.keyboard.press('Tab');
  const focused = await page.evaluate(() => ({
    cls: document.activeElement.className,
    href: document.activeElement.getAttribute('href'),
  }));
  check('content: first Tab focuses skip link', focused.cls === 'skip-link' && focused.href === '#main', JSON.stringify(focused));

  await page.close();
};
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm run check 02`
Expected: FAIL, with `content: index.html exists` failing and `content: index loads` failing (404).

- [ ] **Step 3: Create `index.html`**

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Tim Cardwell | Director of Software Engineering</title>
  <meta name="description" content="Tim Cardwell is a Director of Software Engineering in Chicago who helps enterprises scale product and engineering organizations with AI.">
  <link rel="canonical" href="https://www.timcardwell.com/">
  <link rel="icon" href="favicon.svg" type="image/svg+xml">

  <meta property="og:type" content="website">
  <meta property="og:url" content="https://www.timcardwell.com/">
  <meta property="og:title" content="Tim Cardwell | Director of Software Engineering">
  <meta property="og:description" content="I help enterprises scale product and engineering with AI.">
  <meta property="og:image" content="https://www.timcardwell.com/images/og.jpg">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta name="twitter:card" content="summary_large_image">

  <link rel="stylesheet" href="styles.css">
  <script src="main.js" defer></script>
</head>
<body>
  <a class="skip-link" href="#main">Skip to content</a>

  <header class="site-header">
    <div class="wrap header-inner">
      <a class="wordmark" href="#top">Tim Cardwell</a>
      <nav aria-label="Primary">
        <ul class="nav-list">
          <li><a href="#approach">Approach</a></li>
          <li><a href="#experience">Experience</a></li>
          <li><a href="#contact">Contact</a></li>
        </ul>
      </nav>
    </div>
  </header>

  <main id="main">
    <section class="wrap hero" id="top" aria-labelledby="hero-title">
      <div class="hero-text">
        <p class="eyebrow">Director of Software Engineering · Chicago</p>
        <h1 id="hero-title">Tim Cardwell</h1>
        <p class="lede">I help enterprises scale product and engineering with AI.</p>
        <p class="hero-sub">Fourteen years building enterprise platforms and the teams behind them: growing an engineering department from zero to six teams, moving monoliths to event-driven systems, and now shipping AI across both product and delivery.</p>
        <div class="actions">
          <a class="btn btn-primary" href="resume.pdf" download="Tim_Cardwell_Resume.pdf">Download resume</a>
          <a class="btn" href="https://www.linkedin.com/in/tim-cardwell/" rel="noopener">LinkedIn</a>
        </div>
      </div>
      <img class="portrait" src="images/tim.jpg" alt="Tim Cardwell standing along the Chicago lakefront" width="766" height="625">
    </section>

    <section class="proof" aria-label="Selected results">
      <ul class="wrap proof-list">
        <li class="proof-item reveal">
          <span class="proof-figure">0→6</span>
          <span class="proof-label">engineering teams built and led</span>
        </li>
        <li class="proof-item reveal">
          <span class="proof-figure">$2M+</span>
          <span class="proof-label">annual savings from replacing legacy vendor software</span>
        </li>
        <li class="proof-item reveal">
          <span class="proof-figure">Dozens</span>
          <span class="proof-label">AI-powered features shipped</span>
        </li>
        <li class="proof-item reveal">
          <span class="proof-figure">100k+</span>
          <span class="proof-label">daily document uploads on a rendition system I engineered</span>
        </li>
      </ul>
    </section>

    <section class="wrap section" id="approach" aria-labelledby="approach-title">
      <h2 id="approach-title">AI across product and engineering</h2>
      <p class="section-intro">AI changes both what enterprises can build and how quickly they can build it. I lead on both fronts.</p>
      <div class="pillars">
        <article class="pillar reveal">
          <p class="pillar-kicker">AI in product</p>
          <h3>From chat to complex document intelligence</h3>
          <p>I've led delivery of dozens of AI-powered features, from conversational chat applications to complex document processing and structured data extraction, all running on enterprise platforms designed to carry them.</p>
          <ul class="tags">
            <li>Chat applications</li>
            <li>Document processing</li>
            <li>Data extraction</li>
            <li>RAG and vector search</li>
          </ul>
        </article>
        <article class="pillar reveal">
          <p class="pillar-kicker">AI in engineering</p>
          <h3>An SDLC built around AI agents</h3>
          <p>I introduced a new software development lifecycle that organizes engineers into pods and empowers each pod to manage AI agents. Those pods ship code significantly faster than traditional engineering teams.</p>
          <ul class="tags">
            <li>Pod-based teams</li>
            <li>Engineers managing agents</li>
            <li>AI-augmented SDLC</li>
          </ul>
        </article>
      </div>
    </section>

    <section class="wrap section" id="experience" aria-labelledby="experience-title">
      <h2 id="experience-title">Experience</h2>
      <ol class="timeline">
        <li class="role reveal">
          <p class="role-dates">2023 – Present</p>
          <h3 class="role-title">Director of Software Engineering</h3>
          <p class="role-org">Keller Postman</p>
          <ul>
            <li>Lead a department of six cross-functional teams, grown from zero, and report directly to executive leadership.</li>
            <li>Architected and launched a greenfield, event-driven microservices platform that modernized the firm's core technology.</li>
            <li>Replaced legacy vendor software with in-house solutions, saving over $2M a year and building an in-house engineering culture.</li>
          </ul>
        </li>
        <li class="role reveal">
          <p class="role-dates">2020 – 2023</p>
          <h3 class="role-title">Principal Software Engineer</h3>
          <p class="role-org">Seismic Software</p>
          <ul>
            <li>Architected the "Seismic-protocol," a unified development framework that removed cross-team integration friction across global teams.</li>
            <li>Led the migration from a monolith/microservice hybrid to a fully decoupled, event-driven architecture.</li>
            <li>Engineered a document rendition system handling 100k+ uploads a day, with SRE practices and automated SLO/SLA monitoring.</li>
          </ul>
        </li>
        <li class="role reveal">
          <p class="role-dates">2017 – 2020</p>
          <h3 class="role-title">Engineering Lead</h3>
          <p class="role-org">Donnelley Financial Solutions</p>
          <ul>
            <li>Built the engineering department from inception, establishing Agile workflows and a high-coverage automated testing culture.</li>
            <li>Architected scalable microservices using CQRS and Clean Architecture, with OAuth2 security.</li>
            <li>Mentored junior engineers into high-performing contributors.</li>
          </ul>
        </li>
        <li class="role reveal">
          <p class="role-dates">2012 – 2017</p>
          <h3 class="role-title">Software Consultant</h3>
          <p class="role-org">Echelon Consulting</p>
          <ul>
            <li>Delivered full-cycle software projects for a range of enterprise clients.</li>
            <li>Led the firm's Azure cloud migration and set standards for CI/CD, unit testing and scalable architecture.</li>
          </ul>
        </li>
      </ol>
      <p class="education">B.S. Computer Science and Mathematics, University of Illinois at Urbana-Champaign</p>
    </section>

    <section class="wrap section" aria-labelledby="capabilities-title">
      <h2 id="capabilities-title">Capabilities</h2>
      <div class="capabilities">
        <div class="reveal">
          <h3>Strategic leadership</h3>
          <ul>
            <li>Fractional CTO advisory</li>
            <li>Department scaling (0 to 6 teams)</li>
            <li>Multi-year roadmap planning</li>
            <li>Stakeholder management</li>
          </ul>
        </div>
        <div class="reveal">
          <h3>Technical architecture</h3>
          <ul>
            <li>Event-driven microservices</li>
            <li>Distributed systems</li>
            <li>CQRS and Clean Architecture</li>
            <li>Legacy vendor displacement</li>
          </ul>
        </div>
        <div class="reveal">
          <h3>Operational excellence</h3>
          <ul>
            <li>SRE maturity</li>
            <li>Enterprise compliance</li>
            <li>SDLC optimization</li>
            <li>Cost optimization</li>
          </ul>
        </div>
        <div class="reveal">
          <h3>AI, data and infrastructure</h3>
          <ul>
            <li>AI-augmented SDLC, Semantic Kernel, RAG, vector databases</li>
            <li>.NET/C#, Node.js, Rust, Python, React</li>
            <li>SQL Server, PostgreSQL, CosmosDB, Kafka, RabbitMQ, Redis</li>
            <li>Azure, AWS, Docker, Kubernetes, Terraform, OAuth2/Auth0</li>
          </ul>
        </div>
      </div>
    </section>

    <section class="wrap section" id="contact" aria-labelledby="contact-title">
      <h2 id="contact-title">Get in touch</h2>
      <p class="section-intro">Email is the best way to reach me.</p>
      <a class="contact-email" href="mailto:timothy.cardwell@gmail.com">timothy.cardwell@gmail.com</a>
      <ul class="contact-links">
        <li><a href="https://www.linkedin.com/in/tim-cardwell/" rel="noopener">LinkedIn</a></li>
        <li><a href="https://github.com/TimothyCardwell" rel="noopener">GitHub</a></li>
        <li><a href="resume.pdf" download="Tim_Cardwell_Resume.pdf">Resume (PDF)</a></li>
      </ul>
    </section>
  </main>

  <footer class="site-footer">
    <div class="wrap">© Tim Cardwell · Chicago, IL</div>
  </footer>
</body>
</html>
```

- [ ] **Step 4: Create `favicon.svg`, `robots.txt` and `sitemap.xml`, and copy the resume**

`favicon.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#2f5d3a"/><text x="32" y="42" text-anchor="middle" font-family="Georgia, serif" font-size="28" font-weight="700" fill="#fff">TC</text></svg>
```

`robots.txt`:

```
User-agent: *
Allow: /
Sitemap: https://www.timcardwell.com/sitemap.xml
```

`sitemap.xml`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://www.timcardwell.com/</loc>
  </url>
</urlset>
```

Copy the resume:

```bash
cp /mnt/c/Users/Tim/Downloads/Tim_Cardwell_VisualCV_Resume.pdf resume.pdf
```

- [ ] **Step 5: Run it to verify it passes**

Run: `npm run check 02`
Expected: `0 failed`. The og.jpg file doesn't exist yet, but this check only asserts the meta tag. Task 4 asserts the file.

- [ ] **Step 6: Commit**

```bash
git add index.html favicon.svg resume.pdf robots.txt sitemap.xml tests/checks/02-content.cjs
git commit -m "feat: new single-page content, resume download and static assets"
```

---

### Task 3: Styles, motion and layout checks

**Files:**
- Create: `styles.css`, `main.js`, `tests/checks/03-layout.cjs`

**Interfaces:**
- Consumes: the class and id hooks from Task 2, and the `check` contract from Task 1.
- Produces:
  - `main.js` adds `html.js` only when motion is allowed and `IntersectionObserver` exists.
  - It adds `.is-visible` to `.reveal` elements as they enter the viewport.
  - It sets `aria-current="true"` on the nav link for the section in view.
  - It writes screenshots to `shots/<width>-<scheme>.png`.

- [ ] **Step 1: Write the failing layout check, `tests/checks/03-layout.cjs`**

```js
const fs = require('node:fs');
const path = require('node:path');

// Selectors whose text must meet 4.5:1 against their effective background.
const CONTRAST = [
  'body', '.wordmark', '.nav-list a', '.eyebrow', '.lede', '.hero-sub', '.btn:not(.btn-primary)', '.btn-primary',
  '.proof-figure', '.proof-label', '.section-intro', '.pillar p', '.pillar-kicker', '.tags li',
  '.role-dates', '.role-org', '.role li', '.education', '.capabilities h3', '.capabilities li',
  '.contact-email', '.contact-links a', '.site-footer',
];

async function contrastReport(page) {
  return page.evaluate((selectors) => {
    const parse = (c) => {
      let m = c.match(/^rgba?\(([^)]+)\)$/);
      if (m) {
        const p = m[1].split(/[\s,/]+/).filter(Boolean).map(Number);
        return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
      }
      m = c.match(/^color\(srgb ([^)]+)\)$/);
      if (m) {
        const p = m[1].split(/[\s/]+/).filter(Boolean).map(Number);
        return { r: p[0] * 255, g: p[1] * 255, b: p[2] * 255, a: p.length > 3 ? p[3] : 1 };
      }
      return null;
    };
    const lum = ({ r, g, b }) => {
      const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
    };
    const bgOf = (el) => {
      for (let n = el; n; n = n.parentElement) {
        const c = parse(getComputedStyle(n).backgroundColor);
        if (c && c.a > 0) return c;
      }
      return { r: 255, g: 255, b: 255, a: 1 };
    };
    const out = [];
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (!el) { out.push({ sel, ratio: 0, missing: true }); continue; }
      const fg = parse(getComputedStyle(el).color);
      const bg = bgOf(el);
      const [a, b] = [lum(fg), lum(bg)].sort((x, y) => y - x);
      out.push({ sel, ratio: Math.round(((a + 0.05) / (b + 0.05)) * 100) / 100 });
    }
    return out;
  }, CONTRAST);
}

async function scrollThrough(page) {
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 300) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 60));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(800);
}

const hiddenReveals = (page) =>
  page.locator('.reveal').evaluateAll((els) => els.filter((e) => getComputedStyle(e).opacity !== '1').length);

module.exports = async ({ browser, baseURL, root, check }) => {
  check('layout: styles.css exists', fs.existsSync(path.join(root, 'styles.css')));
  check('layout: main.js exists', fs.existsSync(path.join(root, 'main.js')));
  fs.mkdirSync(path.join(root, 'shots'), { recursive: true });

  for (const width of [1280, 390]) {
    for (const scheme of ['light', 'dark']) {
      const tag = `${width}-${scheme}`;
      const ctx = await browser.newContext({ viewport: { width, height: 900 }, colorScheme: scheme });
      const page = await ctx.newPage();
      const errors = [];
      page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
      page.on('pageerror', (e) => errors.push(e.message));
      page.on('response', (r) => { if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`); });
      await page.goto(baseURL, { waitUntil: 'networkidle' });

      const bodyBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
      check(`layout ${tag}: body has explicit background`, bodyBg !== 'rgba(0, 0, 0, 0)', bodyBg);

      // Review Focus 3: no sideways scroll on a phone.
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      check(`layout ${tag}: no horizontal scroll`, overflow <= 0, `${overflow}px`);

      // Review Focus 4: contrast in both themes.
      for (const { sel, ratio, missing } of await contrastReport(page)) {
        check(`layout ${tag}: contrast ${sel}`, !missing && ratio >= 4.5, missing ? 'missing' : String(ratio));
      }

      await scrollThrough(page);
      check(`layout ${tag}: all .reveal visible after scrolling`, (await hiddenReveals(page)) === 0);
      await page.screenshot({ path: path.join(root, 'shots', `${tag}.png`), fullPage: true });

      // Review Focus 2: anchor targets are not hidden under the sticky header.
      for (const id of ['approach', 'experience', 'contact']) {
        await page.click(`.nav-list a[href="#${id}"]`);
        await page.waitForTimeout(900);
        const gap = await page.evaluate((id) => {
          const header = document.querySelector('.site-header').getBoundingClientRect().bottom;
          const heading = document.querySelector(`#${id} h2`).getBoundingClientRect().top;
          return heading - header;
        }, id);
        check(`layout ${tag}: #${id} heading clears header`, gap >= 0, `${Math.round(gap)}px`);
      }

      check(`layout ${tag}: no console or network errors`, errors.length === 0, errors.join(' | '));
      await ctx.close();
    }
  }

  // Review Focus 1: content never stuck hidden.
  const noJs = await browser.newContext({ javaScriptEnabled: false });
  const p1 = await noJs.newPage();
  await p1.goto(baseURL);
  check('resilience: JS disabled shows all content', (await hiddenReveals(p1)) === 0);
  await noJs.close();

  const broken = await browser.newContext();
  await broken.route('**/main.js', (route) => route.abort());
  const p2 = await broken.newPage();
  await p2.goto(baseURL);
  check('resilience: main.js failing shows all content', (await hiddenReveals(p2)) === 0);
  await broken.close();

  const still = await browser.newContext({ reducedMotion: 'reduce' });
  const p3 = await still.newPage();
  await p3.goto(baseURL, { waitUntil: 'networkidle' });
  check('resilience: reduced motion shows all content without scrolling', (await hiddenReveals(p3)) === 0);
  await still.close();
};
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm run check 03`
Expected: FAIL.
- `layout: styles.css exists` and `layout: main.js exists` fail.
- Every viewport reports `no console or network errors` failing with `404 .../styles.css` and `404 .../main.js`.
- Several `contrast` lines also fail, because unstyled links are browser-default blue on transparent.

- [ ] **Step 3: Create `styles.css`**

```css
:root {
  color-scheme: light;
  --bg: #fbfaf7;
  --surface: #f1efe9;
  --text: #1c1f1d;
  --muted: #545b56;
  --accent: #2f5d3a;
  --accent-contrast: #ffffff;
  --rule: #dcd8ce;
  --maxw: 68rem;
  --gutter: clamp(1rem, 4vw, 2rem);
  --header-offset: 7rem;
  --sans: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  --serif: ui-serif, "Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif;
}

@media (prefers-color-scheme: dark) {
  :root {
    color-scheme: dark;
    --bg: #121513;
    --surface: #1b201c;
    --text: #e8ebe7;
    --muted: #a7afa9;
    --accent: #8cc79a;
    --accent-contrast: #0f1a12;
    --rule: #2c332e;
  }
}

*, *::before, *::after { box-sizing: border-box; }

html { scroll-behavior: smooth; -webkit-text-size-adjust: 100%; }
@media (prefers-reduced-motion: reduce) { html { scroll-behavior: auto; } }

body {
  margin: 0;
  background: var(--bg);
  color: var(--text);
  font: 1.0625rem/1.65 var(--sans);
}

img { display: block; max-width: 100%; height: auto; }
a { color: var(--accent); text-underline-offset: 0.2em; }
:focus-visible { outline: 3px solid var(--accent); outline-offset: 3px; border-radius: 2px; }

h1, h2, h3 {
  font-family: var(--serif);
  font-weight: 600;
  line-height: 1.15;
  letter-spacing: -0.01em;
  margin: 0 0 0.5em;
}
h2 { font-size: clamp(1.75rem, 1.2rem + 2vw, 2.5rem); }
h3 { font-size: 1.25rem; }
p { margin: 0 0 1em; }

.wrap { max-width: var(--maxw); margin-inline: auto; padding-inline: var(--gutter); }

.skip-link {
  position: absolute;
  left: 1rem;
  top: -4rem;
  z-index: 20;
  padding: 0.5rem 1rem;
  background: var(--accent);
  color: var(--accent-contrast);
}
.skip-link:focus { top: 1rem; }

/* Header */
.site-header {
  position: sticky;
  top: 0;
  z-index: 10;
  background: color-mix(in srgb, var(--bg) 92%, transparent);
  backdrop-filter: blur(8px);
  border-bottom: 1px solid var(--rule);
}
.header-inner {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.25rem 1.5rem;
  min-height: 3.5rem;
  padding-block: 0.5rem;
}
.wordmark {
  font-family: var(--serif);
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--text);
  text-decoration: none;
}
.nav-list { display: flex; gap: 1.25rem; margin: 0; padding: 0; list-style: none; }
.nav-list a { color: var(--muted); font-size: 0.95rem; text-decoration: none; }
.nav-list a:hover, .nav-list a[aria-current="true"] { color: var(--text); }

section[id] { scroll-margin-top: var(--header-offset); }

/* Hero */
.hero {
  display: grid;
  gap: 2.5rem;
  align-items: center;
  padding-block: clamp(2.5rem, 8vw, 6.5rem);
}
.eyebrow {
  margin-bottom: 1rem;
  color: var(--muted);
  font-size: 0.875rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.hero h1 { font-size: clamp(2.75rem, 1.5rem + 5vw, 4.75rem); margin-bottom: 0.25em; }
.lede {
  max-width: 24ch;
  font-family: var(--serif);
  font-size: clamp(1.35rem, 1rem + 1.4vw, 1.9rem);
  line-height: 1.3;
}
.hero-sub { max-width: 52ch; color: var(--muted); }
.actions { display: flex; flex-wrap: wrap; gap: 0.75rem; margin-top: 1.75rem; }
.btn {
  display: inline-block;
  padding: 0.7rem 1.25rem;
  border: 1px solid var(--accent);
  border-radius: 999px;
  color: var(--accent);
  font-weight: 600;
  text-decoration: none;
}
.btn-primary { background: var(--accent); color: var(--accent-contrast); }
.portrait {
  order: -1;
  width: 100%;
  max-width: 16rem;
  aspect-ratio: 4 / 5;
  object-fit: cover;
  object-position: 53% 30%;
  border-radius: 1rem;
}
@media (min-width: 52rem) {
  .hero { grid-template-columns: 1.4fr 1fr; }
  .portrait { order: 0; max-width: 22rem; justify-self: end; }
}

/* Proof strip */
.proof { background: var(--surface); border-block: 1px solid var(--rule); }
.proof-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 2rem 1.5rem;
  margin: 0 auto;
  padding-block: 2.5rem;
  list-style: none;
}
@media (min-width: 52rem) { .proof-list { grid-template-columns: repeat(4, minmax(0, 1fr)); } }
.proof-figure {
  display: block;
  color: var(--accent);
  font-family: var(--serif);
  font-size: clamp(2rem, 1.4rem + 2.4vw, 3rem);
  font-weight: 600;
  line-height: 1.1;
}
.proof-label { display: block; margin-top: 0.4rem; color: var(--muted); font-size: 0.95rem; line-height: 1.45; }

/* Sections */
.section { padding-block: clamp(3.5rem, 8vw, 6rem); }
.section-intro { max-width: 60ch; margin-bottom: 2.5rem; color: var(--muted); }

.pillars { display: grid; gap: 1.5rem; }
@media (min-width: 52rem) { .pillars { grid-template-columns: 1fr 1fr; } }
.pillar {
  padding: clamp(1.5rem, 3vw, 2.25rem);
  background: var(--surface);
  border: 1px solid var(--rule);
  border-radius: 1rem;
}
.pillar-kicker {
  margin-bottom: 0.5rem;
  color: var(--accent);
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.tags { display: flex; flex-wrap: wrap; gap: 0.5rem; margin: 1.25rem 0 0; padding: 0; list-style: none; }
.tags li {
  padding: 0.25rem 0.75rem;
  border: 1px solid var(--rule);
  border-radius: 999px;
  color: var(--muted);
  font-size: 0.85rem;
}

/* Experience */
.timeline { margin: 0; padding: 0; list-style: none; border-left: 2px solid var(--rule); }
.role { position: relative; padding: 0 0 2.5rem 1.75rem; }
.role::before {
  content: "";
  position: absolute;
  left: -7px;
  top: 0.45rem;
  width: 12px;
  height: 12px;
  border: 2px solid var(--accent);
  border-radius: 50%;
  background: var(--bg);
}
.role-dates { margin-bottom: 0.25rem; color: var(--muted); font-size: 0.875rem; }
.role-title { margin-bottom: 0.1em; }
.role-org { margin-bottom: 0.75rem; color: var(--accent); font-weight: 600; }
.role ul { max-width: 68ch; margin: 0; padding-left: 1.1rem; }
.role li + li { margin-top: 0.4rem; }
.education { margin-top: 0.5rem; color: var(--muted); }

/* Capabilities */
.capabilities { display: grid; gap: 2rem; grid-template-columns: repeat(auto-fit, minmax(min(100%, 14rem), 1fr)); }
.capabilities h3 {
  color: var(--accent);
  font-family: var(--sans);
  font-size: 0.85rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
.capabilities ul { margin: 0; padding: 0; list-style: none; }
.capabilities li { padding: 0.45rem 0; border-bottom: 1px solid var(--rule); }

/* Contact */
.contact-email {
  font-family: var(--serif);
  font-size: clamp(1.25rem, 0.9rem + 2vw, 2.25rem);
  overflow-wrap: anywhere;
}
.contact-links { display: flex; flex-wrap: wrap; gap: 1.25rem; margin: 1.5rem 0 0; padding: 0; list-style: none; }

.site-footer { padding-block: 2rem; border-top: 1px solid var(--rule); color: var(--muted); font-size: 0.875rem; }

/* Scroll reveal: only hidden once main.js has opted in, so content never depends on JS. */
@media (prefers-reduced-motion: no-preference) {
  .js .reveal { opacity: 0; transform: translateY(12px); transition: opacity 0.6s ease, transform 0.6s ease; }
  .js .reveal.is-visible { opacity: 1; transform: none; }
}
```

- [ ] **Step 4: Create `main.js`**

```js
(() => {
  if (!('IntersectionObserver' in window)) return;

  // Reveal on scroll. The html.js class is what hides .reveal, so it is only added when we can un-hide.
  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const reveal = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          reveal.unobserve(entry.target);
        }
      }
    }, { rootMargin: '0px 0px -10% 0px' });
    document.documentElement.classList.add('js');
    document.querySelectorAll('.reveal').forEach((el) => reveal.observe(el));
  }

  // Mark the nav link for the section currently in view.
  const links = new Map(
    [...document.querySelectorAll('.nav-list a[href^="#"]')].map((a) => [a.hash.slice(1), a])
  );
  const spy = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      links.forEach((link) => link.removeAttribute('aria-current'));
      links.get(entry.target.id).setAttribute('aria-current', 'true');
    }
  }, { rootMargin: '-45% 0px -50% 0px' });
  links.forEach((_, id) => {
    const section = document.getElementById(id);
    if (section) spy.observe(section);
  });
})();
```

- [ ] **Step 5: Run it to verify it passes**

Run: `npm run check 03`
Expected: `0 failed`.
- If a `contrast` line fails, darken `--muted` or `--accent` in light mode, or lighten them in dark mode, by one step and rerun. Never lower the 4.5 threshold.
- If an `#id heading clears header` line fails at 390px, raise `--header-offset` by 1rem and rerun.

- [ ] **Step 6: Look at the screenshots**

Open `shots/1280-light.png`, `shots/1280-dark.png`, `shots/390-light.png` and `shots/390-dark.png` with the Read tool. Confirm these four things:
1. The portrait sits above the text on mobile and to the right on desktop, and the face isn't cropped.
2. The proof strip shows 4 items in a row on desktop and 2×2 on mobile.
3. The pillars are side by side on desktop and stacked on mobile.
4. Nothing overlaps.

Fix any visual defect in `styles.css` and rerun `npm run check 03`.

- [ ] **Step 7: Commit**

```bash
git add styles.css main.js tests/checks/03-layout.cjs
git commit -m "feat: editorial styles, dark mode, scroll reveal and layout checks"
```

---

### Task 4: Social card, README and full verification

**Files:**
- Create: `tools/og-card.html`, `tools/make-og.cjs`, `images/og.jpg` (generated), `tests/checks/04-social.cjs`
- Modify: `README.md` (replace the whole file)

**Interfaces:**
- Consumes: `styles.css` tokens (values copied here, because the card is rendered standalone), and the `check` contract.
- Produces: `npm run og`, which regenerates `images/og.jpg`.

- [ ] **Step 1: Write the failing social check, `tests/checks/04-social.cjs`**

```js
module.exports = async ({ browser, baseURL, check }) => {
  const page = await browser.newPage();
  const res = await page.goto(new URL('images/og.jpg', baseURL).href);
  check('social: og.jpg served', res && res.status() === 200, res && String(res.status()));
  if (res && res.ok()) {
    const size = await page.evaluate(() => {
      const img = document.querySelector('img');
      return `${img.naturalWidth}x${img.naturalHeight}`;
    });
    check('social: og.jpg is 1200x630', size === '1200x630', size);
    check('social: og.jpg under 300 KB', (await res.body()).length < 300 * 1024);
  }
  await page.close();
};
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm run check 04`
Expected: FAIL `social: og.jpg served: 404`

- [ ] **Step 3: Create `tools/og-card.html`**

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<style>
  html, body { margin: 0; width: 1200px; height: 630px; }
  body {
    display: grid;
    grid-template-columns: 1fr 380px;
    background: #fbfaf7;
    color: #1c1f1d;
    font-family: ui-sans-serif, system-ui, "Segoe UI", Roboto, Arial, sans-serif;
  }
  .text { display: flex; flex-direction: column; justify-content: center; padding: 0 64px 0 80px; border-left: 16px solid #2f5d3a; }
  .eyebrow { margin: 0 0 20px; color: #545b56; font-size: 22px; letter-spacing: 0.08em; text-transform: uppercase; }
  h1 { margin: 0 0 20px; font-family: "Iowan Old Style", Palatino, Georgia, serif; font-size: 84px; line-height: 1; }
  p.lede { margin: 0; font-family: "Iowan Old Style", Palatino, Georgia, serif; font-size: 36px; line-height: 1.3; color: #2f5d3a; }
  img { width: 380px; height: 630px; object-fit: cover; object-position: 53% 30%; }
</style>
</head>
<body>
  <div class="text">
    <p class="eyebrow">Director of Software Engineering</p>
    <h1>Tim Cardwell</h1>
    <p class="lede">I help enterprises scale product and engineering with AI.</p>
  </div>
  <img src="../images/tim.jpg" alt="">
</body>
</html>
```

- [ ] **Step 4: Create `tools/make-og.cjs`**

```js
// Renders tools/og-card.html to images/og.jpg (1200x630) for link previews.
const path = require('node:path');
const { chromium } = require('playwright');

(async () => {
  const root = path.resolve(__dirname, '..');
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
  await page.goto(`file://${path.join(root, 'tools', 'og-card.html')}`, { waitUntil: 'load' });
  await page.screenshot({ path: path.join(root, 'images', 'og.jpg'), type: 'jpeg', quality: 85 });
  await browser.close();
  console.log('wrote images/og.jpg');
})();
```

- [ ] **Step 5: Generate and verify**

Run: `npm run og && npm run check 04`
Expected: `wrote images/og.jpg`, then `3 passed, 0 failed`.
Then open `images/og.jpg` with the Read tool and confirm the text isn't clipped and the face is in frame.

- [ ] **Step 6: Replace `README.md`**

```markdown
# timcardwell.com

Personal site for Tim Cardwell, served by GitHub Pages from `master` at https://www.timcardwell.com.

The site is plain HTML, CSS and JS with no build step: `index.html`, `styles.css` and `main.js`.

## Edit and preview

    npm run serve        # http://localhost:8000

To update the resume, overwrite `resume.pdf`. No code change is needed.

## Check before deploying

    npm install && npx playwright install chromium   # first time only
    npm run check        # structure, layout, contrast, resilience; screenshots in shots/
    npm run og           # regenerate images/og.jpg after changing name, title or photo

Pushing to `master` deploys.
```

- [ ] **Step 7: Run the full suite**

Run: `npm run check`
Expected: `0 failed` across all four check files.

- [ ] **Step 8: Commit**

```bash
git add tools images/og.jpg tests/checks/04-social.cjs README.md
git commit -m "feat: social share card, README and full check suite"
```

- [ ] **Step 9: Hand off to Tim for the deploy decision**

Send Tim these four screenshots: `shots/1280-light.png`, `shots/1280-dark.png`, `shots/390-light.png` and `shots/390-dark.png`. Include the `npm run check` summary line.

Ask whether to merge `redesign` into `master` and push. **Do not push without an explicit yes.**

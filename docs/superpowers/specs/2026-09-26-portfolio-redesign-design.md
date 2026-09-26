# Portfolio Redesign: Design Spec

Date: 2026-09-26
Site: https://www.timcardwell.com (GitHub Pages, `master` deploys)

## Goal

This is a personal site aimed at executive search: retained-search partners and hiring committees. A visitor should grasp within about 90 seconds that Tim is a director-level leader who scales enterprise systems and teams, with AI as the current thread across product and engineering.

**Success criteria:**
- What Tim does, the scale he's done it at, and how to reach him are clear within the first screen.
- It reads as senior and credible, not as a template.
- It loads fast, works on a phone with no horizontal scroll, and has no console errors.

## Constraints

- Pure HTML, CSS and JS, with no build step, no frameworks and no external runtime requests (system fonts, inline SVG icons).
- Hosted on GitHub Pages. `CNAME` stays `www.timcardwell.com`.
- All content is sourced from the resume (`Tim_Cardwell_VisualCV_Resume.pdf`) and from Tim's own statements. No invented facts or numbers.

## Approach

A single-page narrative. A multi-page site with a long-form SDLC essay is deferred and will be revisited after launch. Content will be extended by iterating on the live site.

## Page layout (top to bottom)

1. **Header.** A sticky bar with the "Tim Cardwell" wordmark on the left and anchor links (Approach, Experience, Contact) on the right. On mobile it becomes a single wrapped row, with no hamburger menu.
2. **Hero.**
   - Name as the `h1`, with the title "Director of Software Engineering".
   - Positioning line: "I help enterprises scale product and engineering with AI."
   - Buttons: LinkedIn and Download Resume.
   - Portrait (`images/tim.jpg`): beside the text on desktop, above it on mobile.
3. **Proof strip.** Four figures in a single row on desktop and a 2×2 grid on phones:
   - **0→6** engineering teams built
   - **$2M+** annual savings from replacing legacy vendors
   - **Dozens** of AI features shipped
   - **100k+** daily document uploads handled
4. **Two pillars** (`#approach`):
   - **AI in Product:** dozens of AI-powered features shipped, from conversational assistants to complex document processing and structured data extraction.
   - **AI in Engineering:** a new SDLC in which small engineering pods direct AI agents to ship code significantly faster than traditional teams. This stays qualitative until Tim provides a figure.
5. **Experience** (`#experience`): a vertical timeline with title, company, dates and 2–3 bullets per role, based on the resume.
   - Keller Postman: Director of Software Engineering, Jan 2023–present
   - Seismic Software: Principal Software Engineer, Feb 2020–Dec 2023
   - Donnelley Financial Solutions: Engineering Lead, Oct 2017–Feb 2020
   - Echelon Consulting: Software Consultant, May 2012–Oct 2017
   - Education: B.S. Computer Science & Mathematics, UIUC
6. **Capabilities.** Four compact groups, based on the resume:
   - Strategic leadership
   - Technical architecture
   - Operational excellence
   - AI, data and infrastructure
7. **Contact and footer** (`#contact`): `timothy.cardwell@gmail.com`, LinkedIn and GitHub (`TimothyCardwell`). No phone number, map or form.

## Visual direction

- Typography-led and editorial, with generous whitespace and no stock imagery.
- One accent color, a deep green that echoes the resume. All colors are tokens on `:root`.
- Light by default, with dark mode via `prefers-color-scheme`.
- System font stack, with fluid type sizes via `clamp()`.
- Subtle fade-in on scroll using `IntersectionObserver`. It is disabled under `prefers-reduced-motion`, and content stays visible if JS fails: the hidden state is only applied after JS adds a class to `<html>`.

## File structure

```
index.html        single page, semantic HTML
styles.css        single stylesheet
main.js           scroll fade-in and active nav link (<50 lines)
images/tim.jpg    portrait (existing, 766x625, 128 KB; kept as-is)
images/og.jpg     1200x630 social-share card
favicon.svg       "TC" monogram
resume.pdf        copy of Tim_Cardwell_VisualCV_Resume.pdf
sitemap.xml       absolute URL
robots.txt
CNAME             unchanged
README.md         how to edit and preview locally
```

**Deleted:** `plugins/`, `css/`, `js/`, `php/`, `author/`, `categories/`, `tags/`, `index.xml`, the old `sitemap.xml`, and every image except `tim.jpg`. This also removes the Google Maps script and key, and Universal Analytics. No analytics will be added for now.

**Head tags:** `<title>`, meta description, canonical URL, and Open Graph and Twitter card tags pointing to `images/og.jpg`.

## Resume download

The button is live at launch and links to `resume.pdf` with the `download` attribute. It uses the current VisualCV PDF as-is.

**Known issues in that PDF** (fix by overwriting `resume.pdf`; no code change needed):
- The headline reads "Director of Software Engineer".
- The phone number is printed on it.

## Accessibility

- One `h1` and a logical heading order, using `header`, `nav`, `main`, `section` and `footer` landmarks.
- A skip link, visible `:focus-visible` styles, and portrait alt text.
- Text contrast of at least 4.5:1 in both themes.

## Testing before each deploy

1. Serve the site locally with `python3 -m http.server`.
2. Take Playwright screenshots at 1280px and 390px, in light and dark themes.
3. Assert there are no console errors and no horizontal scroll at 390px (`scrollWidth <= clientWidth`).
4. Check links: anchors resolve to existing ids, `resume.pdf` returns 200, and the external links are correct.
5. Show Tim the screenshots, then push to `master` only after his approval.

## Out of scope (later, on the live site)

- A governance/compliance proof point
- A number for the SDLC speed-up
- Earlier LinkedIn projects
- Long-form essay page
- A print-styled resume page
- Cookie-free analytics
- Rotating the old Google Maps API key in Google Cloud Console. This is Tim's action, since the key remains in git history.

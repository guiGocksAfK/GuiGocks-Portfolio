# Guilherme Gabriel Gocks — Portfolio

A developer portfolio built as a pixel-art construction site, where little robots build, fix and look after every section while you watch.

**Live:** [guigocks-portfolio.vercel.app](https://guigocks-portfolio.vercel.app/)

The site is in Brazilian Portuguese; the code and this README are in English.

## Features

- **01 · Introduction** — name, role and a short pitch, with the tech stack typed out group by group (backend, frontend, infra) in a code-style panel.
- **02 · Featured projects** — one card per project with a screenshot, a status stamp, the stack, links to the live site and the repositories, and a drawer of **technical decisions** explaining the choices behind each project.
- **03 · About** — an ID badge with photo and what I'm looking for, a short story, and a career timeline drawn as the floors of a building, with an empty next floor waiting for "your company?".
- **04 · Capabilities** — a tool store: every technology is a crate on a shelf by area. Clicking a crate shows which projects used it and what was used from it.
- **05 · Contact** — e-mail (copied with one click), WhatsApp with a message ready to send and the résumé as a PDF, closed by a park scene as the page's happy ending.
- **Teleport navigation** — the menu and the page's shortcuts don't scroll: they teleport you to the section.
- **A footer** styled as the building site's sign, with a tiny builders' lift that takes you back to the top.

## User experience

The whole site plays out as a building site run by robots. Every section has its own small scene:

| Where | What happens |
|---|---|
| Introduction | A painter robot paints the name; a boss robot with a sign directs a hard-hat crew that stomps each technology into place. A spy peeks over the social buttons, and a mail robot pops up when the e-mail is copied. |
| Section lines | A guard patrols the line that closes each section. About one round in four, a worker comes the other way and they brawl in a cartoon dust cloud until one is punched into the sky. |
| Projects | An inspector stamps each card, and a robot yanks the decisions drawer open, catching its breath halfway on long lists. |
| About | A drone delivers the ID badge. Its photo arrives as big pixels that sharpen into it, dusty, and a robot wipes it clean. A tower crane lowers each floor of the timeline, breaks down halfway until a mechanic hammers it back to life, and later one letter of the story falls off and gets bolted back on. |
| Capabilities | A pump sucks the clicked crate through a pneumatic pipe to the office desk, where a robot climbs out with its contents. The pump has a lever that switches the whole trip off. |
| Contact | The section is built live, in about a minute. The crew hides the damaged wall behind silly disguises, gets caught, paints it, slips in the paint, draws the lines, misspells the title and fixes it, throws every word into place and builds a park. A robot hanging from a rope lets you skip it all. |
| Teleport | The screen is pulled into a curtain of pixels heading the way you're travelling, a trip screen names the destination, and a robot beams in next to its title. Now and then the teleport glitches: the robot arrives upside down, twice, in two halves or charred. |

A few rules keep it pleasant rather than noisy:

- **Calm pacing.** Animations are unhurried and, outside the contact show, one robot moves at a time.
- **Nothing is ever in the way.** Every scene can be skipped or simply ignored, and all the content is readable from the start.
- **Rewards for curious visitors.** The WhatsApp button hides a gag that only arms for people who watched the contact section being built.
- **Phones get their own version.** The long contact show is replaced by the finished section, and the boss robot remarks that you arrived a bit late. The rest of the scenes are adapted to fit a narrow screen.

## Hosting

Deployed on [Vercel](https://vercel.com/) from this repository, with the Next.js preset. The site is fully static: no backend, no database and no environment variables.

## Tech stack

- **[Next.js 16](https://nextjs.org/)** (App Router) with **React 19** and **TypeScript**
- **[Tailwind CSS 4](https://tailwindcss.com/)** plus hand-written CSS for the scenes
- **[Motion](https://motion.dev/)** for the section reveal on scroll
- **`next/font`** for Geist and Geist Mono (the site) and Pixelify Sans (what the robots say)
- **`next/image`** for the screenshots and the photo

The robots don't use any animation library. They run on the **Web Animations API**, **`requestAnimationFrame`** and **canvas**. Every sprite is pixel art written as character maps in the code (`"..BBBB.."`), with no image files.

## Accessibility and performance

- **Reduced motion is respected.** With `prefers-reduced-motion`, nothing is built on screen, every section is simply there and teleporting becomes a plain jump.
- **The content is always in the page.** Sections waiting to be built are only hidden visually, so screen readers and search engines read everything from the first load.
- **Keyboard and screen readers.** There's a skip link, focus moves to the destination's title after a teleport, and every decorative robot is hidden from assistive technology.
- **Animations only run when they can be seen.** They pause when their section is off screen or the tab is in the background, and resume where they left off.
- **Light by design.** There is no animation library for the scenes and no image downloads for the sprites, and the images are resized for the size they're shown at.

## Behind the scenes

- **The contact section is built from the real page.** The robots throw copies of the actual text into place, so the finished section is the same HTML search engines see. A script that runs before the first paint marks the section as "to be built", so it never flashes in finished first.
- **The WhatsApp gag has to be earned.** It only arms when the contact show plays to the end. Skipping it, teleporting in or using a phone leaves the button working normally.
- **The teleport is one canvas.** The pixel curtain, the speed lines and the destination's name are drawn on a single canvas, and the name is rendered small off screen and read back pixel by pixel to be rebuilt from the same squares as the curtain.
- **Scenes can be finished on the spot.** Each step of a scene knows how to jump to its end state, which is how teleporting into the About or Contact section delivers it already built, even halfway through a show.

## Running locally

Requires [Node.js](https://nodejs.org/) 20.9 or newer.

```sh
npm install
npm run dev
```

Then open [localhost:3000](http://localhost:3000).

### Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Starts the development server with hot reload. |
| `npm run build` | Builds the production version. |
| `npm run start` | Serves the production build. |
| `npm run lint` | Runs ESLint over the project. |

### Editing content

No environment variables are needed. All the text, links and project data live in [`src/data/content.ts`](src/data/content.ts), and the colours and scene styles in [`src/app/globals.css`](src/app/globals.css). The photo, the project screenshots and the résumé are in [`public/`](public).

## Project structure

```
src/
├── app/
│   ├── layout.tsx            fonts, metadata and the pre-paint boot script
│   ├── page.tsx              the page: every section in order
│   └── globals.css           theme, layout and every scene's styles
├── data/
│   └── content.ts            all texts, links and project data
└── components/
    ├── robot-sprite.tsx      the pixel-art sprites (robots, drone, forklift)
    ├── robot-crew.ts         the pre-paint boot script and the hero's robots' timing
    ├── painted-name.tsx      the painter robot on the name
    ├── technology-typing.tsx the tech stack typed out by the crew
    ├── patrol-robot.tsx      the guard on each section line, and its brawls
    ├── project-stamp.tsx     the inspector's stamp on each project card
    ├── project-drawer.tsx    the technical decisions drawer and its robot
    ├── email-copy.tsx        copying the e-mail, with the mail robot
    ├── about-badge.tsx       the ID badge: drone, pixel reveal, cleaner, spy
    ├── career-building.tsx   the timeline building and its crane
    ├── story-debug.tsx       the letter that falls off and gets fixed
    ├── scene.ts              runs a section's scene one step at a time
    ├── scene-trigger.tsx     starts a scene when its section comes into view
    ├── capabilities-yard.tsx the tool store, pump and pneumatic pipe
    ├── contact-stage.tsx     the live build of the contact section
    ├── contact-list.tsx      the contact rows (e-mail, WhatsApp, résumé)
    ├── zap-gag.ts            the WhatsApp button's gag
    ├── ending-scene.tsx      the park at the end of the page
    ├── teleport.tsx          teleport navigation
    ├── site-footer.tsx       the footer, with the builders' lift
    └── reveal.tsx            fade-in on scroll
```

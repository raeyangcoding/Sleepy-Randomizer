# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Start the dev server (serves static files + Bilibili API proxy on port 3000)
node server.js

# Run tests
node tests/bilibili-proxy.test.js
```

No build step, no package.json, no npm dependencies — the server uses only Node.js built-in modules (`http`, `https`, `fs`, `path`, `url`). The frontend loads Tailwind CSS, Lucide icons, and Google Fonts from CDN.

## Architecture

**Sleepy Randomizer** is a bedtime wind-down tool: maintain a list of relaxing videos (Bilibili/YouTube) and randomly pick one to play.

### Single-file frontend (`index.html`)

The entire app lives in `index.html` — HTML structure, inline `<style>` with Tailwind overrides, and inline `<script>` with all application logic. There is no framework, no router, no component tree.

- **State** is held in `mockData.videos` (an array of `{id, type, title, source, cover, url}` objects) and global variables (`currentTab`, `isEditMode`, `isCollapsed`, `selectedVideoIds`). There is no localStorage persistence in the active code.
- **Rendering** is imperative: `renderAll()` → `renderActionBar()` / `renderVideoList()` / `renderMusicList()` overwrite `innerHTML` of DOM containers.
- **Tabs**: `video` (fully functional) and `music` (shows a "coming soon" overlay; `renderMusicList()` renders hardcoded mock data).
- **Random playback** uses a shuffle queue (`shuffledQueue`, `queueIndex`) — `pickAndPlayRandom()` shuffles the list, iterates through without repeats, and re-shuffles when the queue is exhausted. Clicking an item in the list also opens it.
- **Adding videos**: a popover (`#add-link-popover`) accepts a URL, parses Bilibili (via `api.bilibili.com` + b23.tv redirect-follow) or YouTube (via oEmbed), and prepends to `mockData.videos`.
- **Cover preloading**: `preloadBilibiliCovers()` runs on page load, trying the local proxy first (`/api/bilibili?input=`), falling back to direct Bilibili API, with 300ms delays between requests.
- **Edit mode**: multi-select with "select all", drag-to-reorder, and batch delete with a confirmation dialog.
- **Share/Export**: generates standalone HTML documents via `Blob` + `URL.createObjectURL()`, opened in new tabs.

### Server proxy (`server.js`)

A Node.js HTTP server (port 3000 by default) that does two things:

1. **Static file serving** — maps URL paths to the filesystem (root is the repo directory). `/` → `index.html`. MIME types are hardcoded in a lookup table.
2. **`/api/bilibili?input=<url-or-bvid>`** — proxy endpoint:
   - Extracts BVID via regex (`BV[0-9A-Za-z]{10}`)
   - Resolves b23.tv short links by following HTTP redirects (up to 5 hops)
   - Fetches video metadata from `api.bilibili.com/x/web-interface/view?bvid=`
   - Returns `{bvid, title, pic, url}` JSON with CORS headers
   - Returns 400 (missing input), 404 (not found), or 502 (upstream error)

The server is also usable as a module — it exports `extractBvid`, `normalizeUrl`, `getBilibiliMeta`, and `createServer`.

### Data files

- `data/recommended-videos.js` — seed video list, loaded as `window.RECOMMENDED_VIDEOS` via a `<script>` tag. Used to initialize `mockData.videos` on first load.
- `data/recommended-music.js` — seed music list as `window.RECOMMENDED_MUSIC` (currently unused; music tab uses hardcoded mock data in the inline script instead).
- `resources/fallback-cover.png` — placeholder image shown when a video cover can't be loaded.

### Legacy files (not used by the current app)

- `app.js` — older IIFE-based version using `localStorage`, different DOM IDs, and a `window.app` export pattern. `index.html` does not load this file.
- `styles.css` — stylesheet for the older version (different CSS variables and selectors). `index.html` does not load this file.

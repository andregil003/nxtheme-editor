const REPO = "ThemezerNX/Layouts"
const BRANCH = "master"

const TARGET_MAP: Record<string, string> = {
  ResidentMenu: "home",
  Entrance: "lock",
  Flaunch: "apps",
  Set: "set",
  Notification: "news",
  MyPage: "user",
  Psl: "psl",
}

const CACHE_TTL_MS = 60 * 60 * 1000

type LibraryLayout = {
  target: string
  name: string
  layoutPath: string
  overlayUrl: string
}

type TreeEntry = { type?: string; path?: string }

let cache: { at: number; layouts: LibraryLayout[] } | null = null

export default defineEventHandler(async () => {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) {
    return { layouts: cache.layouts }
  }

  const tree = await $fetch<{ tree?: TreeEntry[] }>(
    `https://api.github.com/repos/${REPO}/git/trees/${BRANCH}?recursive=1`,
  )

  const layouts: LibraryLayout[] = []
  for (const entry of tree.tree ?? []) {
    if (entry.type !== "blob" || !entry.path) continue
    const match = /^targets\/([A-Za-z]+)\/([^/_][^/]*)\/layout\.json$/.exec(entry.path)
    if (!match) continue
    const infoTarget = TARGET_MAP[match[1]]
    if (!infoTarget) continue
    const folderPath = `targets/${match[1]}/${match[2]}`
      .split("/")
      .map((segment) => encodeURIComponent(segment))
      .join("/")
    const base = `https://raw.githubusercontent.com/${REPO}/${BRANCH}/${folderPath}`
    layouts.push({
      target: infoTarget,
      name: match[2],
      layoutPath: entry.path,
      overlayUrl: `${base}/overlay.png`,
    })
  }

  cache = { at: Date.now(), layouts }
  return { layouts }
})

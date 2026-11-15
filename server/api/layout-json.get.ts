const REPO = "ThemezerNX/Layouts"
const BRANCH = "master"

const LAYOUT_PATH_PATTERN = /^targets\/[A-Za-z]+\/[^/]+\/layout\.json$/

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const path = String(query.path ?? "")

  if (!LAYOUT_PATH_PATTERN.test(path)) {
    throw createError({ statusCode: 400, statusMessage: "Invalid layout path" })
  }

  const encodedPath = path
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/")
  const url = `https://raw.githubusercontent.com/${REPO}/${BRANCH}/${encodedPath}`

  const text = await $fetch<string>(url, { responseType: "text" })
  setHeader(event, "content-type", "text/plain; charset=utf-8")
  return text
})

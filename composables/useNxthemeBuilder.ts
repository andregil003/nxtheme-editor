import {
  buildNxthemeArchive,
  getNxthemeCreatorFilename,
  getNxthemeLayoutInfo,
  type NxthemeAssetKey,
} from "@themezernx/nxtheme-builder"
import { toNice } from "@themezernx/target-parser"
import {
  getAllowedAssetKeysByTarget,
  normalizeToInfoTarget,
  type NxthemeInfoTarget,
  type SwitchThemeFormData,
} from "~/types/switch-theme"

const fileToBytes = async (file: File): Promise<Uint8Array> => {
  return new Uint8Array(await file.arrayBuffer())
}

const bytesToArrayBuffer = (bytes: Uint8Array): ArrayBuffer => {
    const out = new Uint8Array(bytes.byteLength)
    out.set(bytes)
    return out.buffer
}

const createPartId = (): string => crypto.randomUUID().slice(0, 8)

const triggerDownload = (bytes: Uint8Array, filename: string) => {
  const blob = new Blob([bytesToArrayBuffer(bytes)], { type: "application/octet-stream" })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

const buildThemeBytes = async (
  formData: SwitchThemeFormData,
  options?: { freshId?: boolean },
): Promise<{ buffer: Uint8Array; filename: string }> => {
  const hasBackground = Boolean(formData.assets.backgroundImage)
  const hasLayout = Boolean(formData.layoutJson.trim())
  if (!hasBackground && !hasLayout) {
    throw new Error("Provide a background image or a layout JSON file.")
  }

  const infoTarget = normalizeToInfoTarget(formData.target)
  if (!infoTarget) {
    throw new Error(`Invalid theme target: ${formData.target}`)
  }

  // Only keep assets that are valid for this target (icons only apply to home/lock, etc.)
  const allowedKeys = new Set(getAllowedAssetKeysByTarget(infoTarget))
  const preparedAssets: Partial<Record<NxthemeAssetKey, Uint8Array>> = {}
  for (const [key, value] of Object.entries(formData.assets) as [NxthemeAssetKey, File | null][]) {
    if (!value || !allowedKeys.has(key)) continue
    preparedAssets[key] = await fileToBytes(value)
  }

  const id = options?.freshId ? createPartId() : formData.id

  const buffer = buildNxthemeArchive({
    name: formData.name.trim(),
    author: formData.author.trim(),
    targetThemeValue: infoTarget,
    layoutJson: formData.layoutJson.trim() || undefined,
    commonJson: formData.commonJson.trim() || undefined,
    id,
    assets: preparedAssets,
  })

  const filename = getNxthemeCreatorFilename({
    name: formData.name.trim(),
    author: formData.author.trim(),
    targetName: toNice(infoTarget) ?? infoTarget,
    layoutInfo: getNxthemeLayoutInfo(formData.layoutJson.trim()),
  })

  return { buffer, filename }
}

export const useNxthemeBuilder = () => {
  const buildAndDownload = async (formData: SwitchThemeFormData): Promise<string> => {
    const { buffer, filename } = await buildThemeBytes(formData)
    triggerDownload(buffer, filename)
    return filename
  }

  /**
   * Builds one .nxtheme per provided form (each form carries its own target and assets),
   * downloading them sequentially with a small delay so the browser doesn't block
   * multiple downloads. Forms without any background or layout are skipped.
   */
  const buildAndDownloadMultiple = async (
    forms: SwitchThemeFormData[],
    options?: { delayMs?: number },
  ): Promise<{
    results: Array<{ target: NxthemeInfoTarget; filename: string }>
    skipped: NxthemeInfoTarget[]
  }> => {
    const results: Array<{ target: NxthemeInfoTarget; filename: string }> = []
    const skipped: NxthemeInfoTarget[] = []
    const delayMs = options?.delayMs ?? 450

    for (let index = 0; index < forms.length; index++) {
      const formData = forms[index]
      const infoTarget = normalizeToInfoTarget(formData.target)
      if (!infoTarget) continue

      const hasBackground = Boolean(formData.assets.backgroundImage)
      const hasLayout = Boolean(formData.layoutJson.trim())
      if (!hasBackground && !hasLayout) {
        skipped.push(infoTarget)
        continue
      }

      const { buffer, filename } = await buildThemeBytes(formData, { freshId: true })
      if (results.length > 0) {
        await new Promise((resolve) => setTimeout(resolve, delayMs))
      }
      triggerDownload(buffer, filename)
      results.push({ target: infoTarget, filename })
    }

    return { results, skipped }
  }

  return {
    buildAndDownload,
    buildAndDownloadMultiple,
  }
}

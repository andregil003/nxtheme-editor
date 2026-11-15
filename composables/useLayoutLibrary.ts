import type { NxthemeInfoTarget } from "~/types/switch-theme"

export type LibraryLayout = {
  target: NxthemeInfoTarget
  name: string
  layoutPath: string
  overlayUrl: string
}

export const useLayoutLibrary = () => {
  const layouts = ref<LibraryLayout[]>([])
  const loading = ref(false)
  const error = ref("")
  let loaded = false

  const load = async () => {
    if (loaded || loading.value) return
    loading.value = true
    error.value = ""
    try {
      const response = await $fetch<{ layouts: LibraryLayout[] }>("/api/layouts")
      layouts.value = response.layouts ?? []
      loaded = true
    } catch {
      error.value = "Could not load the layout library. Check your internet connection and try again."
    } finally {
      loading.value = false
    }
  }

  const layoutsForTarget = (target: NxthemeInfoTarget): LibraryLayout[] =>
    layouts.value.filter((item) => item.target === target)

  const fetchLayoutJson = async (layoutPath: string): Promise<string> => {
    return await $fetch<string>("/api/layout-json", {
      query: { path: layoutPath },
      responseType: "text",
    })
  }

  return {
    layouts,
    loading,
    error,
    load,
    layoutsForTarget,
    fetchLayoutJson,
  }
}

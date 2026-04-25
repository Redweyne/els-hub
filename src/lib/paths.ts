export const APP_BASE_PATH = "/els"

export function appPath(path: string) {
  if (!path.startsWith("/")) return `${APP_BASE_PATH}/${path}`
  return `${APP_BASE_PATH}${path}`
}

export function apiPath(path: string) {
  return appPath(path.startsWith("/api") ? path : `/api${path}`)
}

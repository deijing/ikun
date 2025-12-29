const IMAGE_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/gif',
])

const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp', '.gif']

export const IMAGE_ACCEPT = `${Array.from(IMAGE_TYPES).join(',')},${IMAGE_EXTENSIONS.join(',')}`

export function validateImageFile(file, maxBytes) {
  if (!file) return '请选择图片文件'
  if (maxBytes && file.size > maxBytes) {
    return `图片过大（最大 ${Math.round(maxBytes / 1024 / 1024)}MB）`
  }
  const type = String(file.type || '').toLowerCase()
  if (type && IMAGE_TYPES.has(type)) return null

  const name = String(file.name || '').toLowerCase()
  if (IMAGE_EXTENSIONS.some((ext) => name.endsWith(ext))) return null

  return '仅支持 PNG/JPG/WebP/GIF 格式'
}

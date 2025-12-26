import defaultAvatar from '@/assets/avatar-default.svg'

export function resolveAvatarUrl(avatarUrl) {
  return avatarUrl || defaultAvatar
}

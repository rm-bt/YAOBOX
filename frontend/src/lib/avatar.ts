export const AVATAR_STORAGE_KEY = "yaobox_avatar";

export type AvatarOption = {
  id: string;
  label: string;
  emoji: string;
  bgClass: string;
};

export const AVATAR_OPTIONS: AvatarOption[] = [
  {
    id: "leaf",
    label: "Green wellness",
    emoji: "🌿",
    bgClass: "bg-[#d9e9c6]",
  },
  {
    id: "pill",
    label: "Medicine",
    emoji: "💊",
    bgClass: "bg-[#e8eef8]",
  },
  {
    id: "heart",
    label: "Health",
    emoji: "💚",
    bgClass: "bg-[#dff3e5]",
  },
  {
    id: "star",
    label: "Focused",
    emoji: "⭐",
    bgClass: "bg-[#fff2c7]",
  },
  {
    id: "moon",
    label: "Calm",
    emoji: "🌙",
    bgClass: "bg-[#e7e2f7]",
  },
  {
    id: "user",
    label: "Classic",
    emoji: "👤",
    bgClass: "bg-[#eef3e4]",
  },
];

export function getStoredAvatarId(): string {
  if (typeof window === "undefined") {
    return "leaf";
  }

  const stored = window.localStorage.getItem(AVATAR_STORAGE_KEY);
  const exists = AVATAR_OPTIONS.some((option) => option.id === stored);

  return exists && stored ? stored : "leaf";
}

export function getAvatarOption(avatarId?: string | null): AvatarOption {
  return (
    AVATAR_OPTIONS.find((option) => option.id === avatarId) ??
    AVATAR_OPTIONS[0]
  );
}

export function setStoredAvatarId(avatarId: string) {
  if (typeof window === "undefined") {
    return;
  }

  const exists = AVATAR_OPTIONS.some((option) => option.id === avatarId);

  if (!exists) {
    return;
  }

  window.localStorage.setItem(AVATAR_STORAGE_KEY, avatarId);
  window.dispatchEvent(new Event("yaobox-avatar-change"));
}
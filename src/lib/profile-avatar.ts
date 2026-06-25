export const PROFILE_EMOJI_GROUPS = [
  {
    id: "smileys",
    labelKey: "profileEmoji_groupSmileys",
    emojis: ["😀", "😎", "🥳", "🤩", "😇", "🙂", "😌", "🤓", "🧐", "😴", "🤗", "😊"],
  },
  {
    id: "animals",
    labelKey: "profileEmoji_groupAnimals",
    emojis: ["🐶", "🐱", "🦊", "🐻", "🐼", "🦁", "🐯", "🐨", "🐸", "🦄", "🐰", "🐧"],
  },
  {
    id: "nature",
    labelKey: "profileEmoji_groupNature",
    emojis: ["🌸", "🌺", "🌻", "🌈", "⭐", "🌙", "☀️", "🍀", "🌊", "🔥", "❄️", "🍎"],
  },
  {
    id: "activities",
    labelKey: "profileEmoji_groupActivities",
    emojis: ["⚽", "🏀", "🎾", "🎮", "🎨", "🎵", "🎸", "📚", "✈️", "🚗", "🚲", "🏠"],
  },
  {
    id: "objects",
    labelKey: "profileEmoji_groupObjects",
    emojis: ["💎", "🎯", "💡", "🔔", "🎁", "💰", "📱", "💻", "☕", "🍕", "🍰", "❤️"],
  },
] as const;

export const ALLOWED_PROFILE_EMOJIS = new Set<string>(
  PROFILE_EMOJI_GROUPS.flatMap((group) => group.emojis)
);

const PROFILE_AVATAR_GRADIENTS: [string, string][] = [
  ["#5AC8FA", "#007AFF"],
  ["#34C759", "#248A3D"],
  ["#FF9500", "#FF6B00"],
  ["#FF2D55", "#C41E3A"],
  ["#AF52DE", "#5856D6"],
  ["#FFD60A", "#FF9F0A"],
  ["#64D2FF", "#0A84FF"],
  ["#30D158", "#32ADE6"],
];

export function isAllowedProfileEmoji(value: string | null | undefined): boolean {
  if (value == null || value === "") return true;
  return ALLOWED_PROFILE_EMOJIS.has(value);
}

export function profileAvatarGradient(emoji: string): string {
  let hash = 0;
  for (let i = 0; i < emoji.length; i++) {
    hash = (hash + emoji.charCodeAt(i) * (i + 1)) % PROFILE_AVATAR_GRADIENTS.length;
  }
  const [from, to] = PROFILE_AVATAR_GRADIENTS[hash];
  return `linear-gradient(135deg, ${from} 0%, ${to} 100%)`;
}

export function profileAvatarInitial(name: string | null | undefined, role: string): string {
  if (name?.trim()) return name.trim()[0].toUpperCase();
  if (role === "husband") return "Ч";
  if (role === "wife") return "Д";
  if (role === "friend") return "Д";
  return "?";
}

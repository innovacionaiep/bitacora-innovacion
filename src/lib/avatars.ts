export interface PredefinedAvatar {
  id: string;
  url: string;
  name: string;
}

export const PREDEFINED_AVATARS: PredefinedAvatar[] = Array.from(
  { length: 20 },
  (_, i) => {
    const num = i + 1;
    const ext = num === 1 ? 'png' : 'jpg';
    return {
      id: `avatar-${num}`,
      url: `/avatars/avatar-${num}.${ext}`,
      name: `Avatar ${num}`,
    };
  }
);

// Función helper para obtener avatar por ID
export const getAvatarById = (id: string): PredefinedAvatar | undefined => {
  return PREDEFINED_AVATARS.find((avatar) => avatar.id === id);
};

// Función helper para obtener avatar por URL
export const getAvatarByUrl = (url: string): PredefinedAvatar | undefined => {
  return PREDEFINED_AVATARS.find((avatar) => avatar.url === url);
};

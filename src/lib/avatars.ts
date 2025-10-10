export interface PredefinedAvatar {
  id: string;
  url: string;
  name: string;
}

export const PREDEFINED_AVATARS: PredefinedAvatar[] = Array.from({ length: 20 }, (_, i) => ({
  id: `avatar-${i + 1}`,
  url: `/avatars/avatar-${i + 1}.png`,
  name: `Avatar ${i + 1}`
}));

// Función helper para obtener avatar por ID
export const getAvatarById = (id: string): PredefinedAvatar | undefined => {
  return PREDEFINED_AVATARS.find(avatar => avatar.id === id);
};

// Función helper para obtener avatar por URL
export const getAvatarByUrl = (url: string): PredefinedAvatar | undefined => {
  return PREDEFINED_AVATARS.find(avatar => avatar.url === url);
};

export const escapeRegex = (text: string) => {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); // $& means the whole matched string
};

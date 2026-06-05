export const pluralise = (count: number, noun: string, pluralNoun?: string) => {
  if (count === 1) {
    return `${count} ${noun}`;
  }
  if (!pluralNoun) {
    return `${count} ${noun}s`;
  }
  return `${count} ${pluralNoun}`;
};

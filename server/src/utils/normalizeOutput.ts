export const normalizeOutput = (raw: string): string => {
  const trimmed = raw.replace("/\s+g", " ").trim();
  try {
    const parsed = JSON.parse(trimmed);

    if (
      typeof parsed === "object" ||
      typeof parsed === "boolean" ||
      typeof parsed === "number"
    ) {
      return JSON.stringify(parsed);
    }

    if (typeof parsed === "string") {
      return parsed;
    }
  } catch (error) {}

  return trimmed;
};

// @ts-ignore
import pdfParse from "pdf-parse/lib/pdf-parse.js";
import mammoth from "mammoth";
import { SkillDefinition } from "../../models/SkillDefinition.js";
import { Skill } from "../../models/Skill.js";
import { ensureDefaultSkillDefinitions } from "./skill-catalog.service.js";

// Extract raw text from file based on MIME type
const extractText = async (
  buffer: Buffer,
  mimeType: string,
): Promise<string> => {
  if (mimeType === "application/pdf") {
    const result = await pdfParse(buffer);
    return result.text;
  }
  if (
    mimeType ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }
  throw new Error("Unsupported file type. Only PDF and DOCX are allowed.");
};

// Tokenise text into individual words
const tokenize = (text: string): Set<string> => {
  const tokens = new Set<string>();
  const lower = text.toLowerCase();

  // Split into words, but preserve dots and #
  const words = lower.match(/[\w.#+]+/g) || [];
  words.forEach((w) => tokens.add(w));

  // Also generate 2-word sliding windows for compound names like "tailwind css"
  const cleanWords = lower.split(/\s+/);
  for (let i = 0; i < cleanWords.length - 1; i++) {
    tokens.add(`${cleanWords[i]} ${cleanWords[i + 1]}`);
  }
  return tokens;
};

// Parse resume
export const parseResume = async (
  buffer: Buffer,
  mimeType: string,
  userId: string,
) => {
  // Extract text
  const rawText = await extractText(buffer, mimeType);
  if (!rawText || rawText.trim().length < 20) {
    throw new Error(
      "Could not extract meaningful text from the uploaded file.",
    );
  }
  // Tokenize
  const tokens = tokenize(rawText);

  // Match against SkillDefinition catalog
  await ensureDefaultSkillDefinitions();
  const allSkills = await SkillDefinition.find({ isActive: true }).lean();
  const detectedSkills = allSkills.filter((skill) =>
    tokens.has(skill.normalizedName),
  );

  // Exclude skills the user already has
  const existingSkills = await Skill.find({ userId }).lean();
  const existingNames = new Set(
    existingSkills.map((s) => s.name.toLowerCase()),
  );

  const newSkills = detectedSkills.filter(
    (s) => !existingNames.has(s.name.toLowerCase()),
  );

  return {
    extractedText: rawText.slice(0, 500), // Preview only (for debugging)
    totalTokens: tokens.size,
    allDetected: detectedSkills.map((s) => ({
      name: s.name,
      category: s.category,
    })),
    newSkills: newSkills.map((s) => ({
      name: s.name,
      category: s.category,
    })),
    alreadyOwned: detectedSkills.length - newSkills.length,
  };
};

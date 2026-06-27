import { Schema, model, type Document } from "mongoose";
import type { IQuestion } from "../types/index.js";

const questionSchema = new Schema<IQuestion & Document>(
  {
    questionId: { type: String, required: true, unique: true },
    skill: { type: String, required: true, index: true },
    level: {
      type: String,
      enum: ["beginner", "intermediate", "advanced"],
      required: true,
      index: true,
    },
    topic: { type: String, required: true },
    type: { type: String, enum: ["mcq", "code"], required: true },
    question: { type: String },
    isHidden: { type: Boolean, default: false, index: true },

    // MCQ Fields
    options: [{ type: String }],
    correctAnswerIndex: { type: Number },

    // Code Fields
    starterCode: { type: String },
    validationScript: { type: String },
    testCases: [
      {
        input: { type: String },
        output: { type: String },
      },
    ],
  },
  { timestamps: true },
);

questionSchema.index({ skill: 1, level: 1 });

export const Question = model<IQuestion & Document>("Question", questionSchema);

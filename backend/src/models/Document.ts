// Document model -- 2026-07-14 12:52:26
import mongoose, { Document, Schema } from 'mongoose';

export interface IDocument extends Document {
  repoId: string;
  filePath: string;
  content: string;
  linesOfCode: number;
  functionCount: number;
  complexity: number;
  lastCommitSha: string;
  generatedAt: Date;
  outdated: boolean;
}

const DocumentSchema = new Schema<IDocument>({
  repoId: { type: String, required: true, index: true },
  filePath: { type: String, required: true },
  content: { type: String, required: true },
  linesOfCode: { type: Number, default: 0 },
  functionCount: { type: Number, default: 0 },
  complexity: { type: Number, default: 1 },
  lastCommitSha: { type: String, required: true },
  generatedAt: { type: Date, default: Date.now },
  outdated: { type: Boolean, default: false },
}, { timestamps: true });

DocumentSchema.index({ repoId: 1, filePath: 1 }, { unique: true });

export const DocModel = mongoose.model<IDocument>('Document', DocumentSchema);
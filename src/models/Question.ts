import mongoose, { Document, Schema } from 'mongoose';

export interface IQuestionOption {
  label: 'A' | 'B' | 'C' | 'D';
  text: string;
}

export interface IQuestion extends Document {
  question_id: number;
  competency_id: number;
  level: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
  question_text: string;
  options: IQuestionOption[];
  correct_answer: 'A' | 'B' | 'C' | 'D';
  difficulty_points?: number;
  created_at: Date;
  updated_at: Date;
}

const QuestionSchema: Schema = new Schema({
  question_id: { type: Number, required: true, unique: true },
  competency_id: { type: Number, required: true },
  level: { 
    type: String, 
    required: true, 
    enum: ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] 
  },
  question_text: { type: String, required: true },
  options: [{
    label: { type: String, enum: ['A', 'B', 'C', 'D'], required: true },
    text: { type: String, required: true }
  }],
  correct_answer: { 
    type: String, 
    required: true, 
    enum: ['A', 'B', 'C', 'D'] 
  },
  difficulty_points: { type: Number, default: 1 },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});

QuestionSchema.index({ competency_id: 1, level: 1 });

export default mongoose.model<IQuestion>('Question', QuestionSchema);
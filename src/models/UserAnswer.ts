import mongoose, { Document, Schema } from 'mongoose';

export interface IUserAnswer extends Document {
  session_id: string;
  step: number;
  question_id: string;
  user_answer: 'A' | 'B' | 'C' | 'D';
  correct_answer: 'A' | 'B' | 'C' | 'D';
  is_correct: boolean;
  time_spent: number;
  answered_at: Date;
}

const UserAnswerSchema: Schema = new Schema({
  session_id: { type: Schema.Types.ObjectId, ref: 'AssessmentSession', required: true },
  step: { type: Number, required: true },
  question_id: { type: Schema.Types.ObjectId, ref: 'Question', required: true },
  user_answer: { type: String, enum: ['A', 'B', 'C', 'D'], required: true },
  correct_answer: { type: String, enum: ['A', 'B', 'C', 'D'], required: true },
  is_correct: { type: Boolean, required: true },
  time_spent: { type: Number, required: true },
  answered_at: { type: Date, default: Date.now }
});

export default mongoose.model<IUserAnswer>('UserAnswer', UserAnswerSchema);
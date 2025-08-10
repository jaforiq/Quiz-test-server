import mongoose, { Document, Schema } from 'mongoose';

export interface IStepResult {
  step: number;
  levels_tested: string[];
  questions_attempted: string[];
  score_percentage: number;
  certification_achieved: string;
  step_start: Date;
  step_end: Date;
  time_taken: number;
}

export interface IAssessmentSession extends Document {
  user_id: string;
  session_start: Date;
  session_end?: Date;
  current_step: 1 | 2 | 3;
  status: 'in_progress' | 'completed' | 'failed';
  final_certification?: string;
  step_results: IStepResult[];
  created_at: Date;
  updated_at: Date;
}

const AssessmentSessionSchema: Schema = new Schema({
  user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  session_start: { type: Date, required: true },
  session_end: { type: Date },
  current_step: { type: Number, enum: [1, 2, 3], default: 1 },
  status: { 
    type: String, 
    enum: ['in_progress', 'completed', 'failed'], 
    default: 'in_progress' 
  },
  final_certification: { type: String },
  step_results: [{
    step: { type: Number, required: true },
    levels_tested: [{ type: String, required: true }],
    questions_attempted: [{ type: Schema.Types.ObjectId, ref: 'Question' }],
    score_percentage: { type: Number, required: true },
    certification_achieved: { type: String, required: true },
    step_start: { type: Date, required: true },
    step_end: { type: Date, required: true },
    time_taken: { type: Number, required: true }
  }],
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});

export default mongoose.model<IAssessmentSession>('AssessmentSession', AssessmentSessionSchema);

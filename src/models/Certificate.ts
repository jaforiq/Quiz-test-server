import mongoose, { Document, Schema } from 'mongoose';

export interface ICertificate extends Document {
  user_id: string;
  session_id: string;
  certificate_level: string;
  certificate_number: string;
  issued_date: Date;
  competencies_assessed: number[];
  overall_score: number;
  step_scores: {
    step: number;
    score_percentage: number;
    levels_covered: string[];
  }[];
}

const CertificateSchema: Schema = new Schema({
  user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  session_id: { type: Schema.Types.ObjectId, ref: 'AssessmentSession', required: true },
  certificate_level: { type: String, required: true },
  certificate_number: { type: String, required: true, unique: true },
  issued_date: { type: Date, default: Date.now },
  competencies_assessed: [{ type: Number, required: true }],
  overall_score: { type: Number, required: true },
  step_scores: [{
    step: { type: Number, required: true },
    score_percentage: { type: Number, required: true },
    levels_covered: [{ type: String, required: true }]
  }]
});

export default mongoose.model<ICertificate>('Certificate', CertificateSchema);

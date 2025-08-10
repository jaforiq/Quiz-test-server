import mongoose, { Document, Schema } from 'mongoose';

export interface ICompetency extends Document {
  competency_id: number;
  competency_name: string;
  description: string;
  created_at: Date;
  updated_at: Date;
}

const CompetencySchema: Schema = new Schema({
  competency_id: { type: Number, required: true, unique: true },
  competency_name: { type: String, required: true },
  description: { type: String, required: true },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});

export default mongoose.model<ICompetency>('Competency', CompetencySchema);

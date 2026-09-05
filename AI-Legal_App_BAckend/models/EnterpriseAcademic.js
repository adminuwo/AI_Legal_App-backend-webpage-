import mongoose from 'mongoose';

const subjectSchema = new mongoose.Schema({
  name: { type: String, required: true },
  code: { type: String, default: '' },
  units: [{
    unitNumber: Number,
    title: String,
    topics: [String],
    learningOutcomes: [String]
  }]
});

const semesterSchema = new mongoose.Schema({
  number: { type: Number, required: true },
  name: { type: String, default: '' },
  subjects: [subjectSchema]
});

const batchSchema = new mongoose.Schema({
  name: { type: String, required: true }, // e.g. "2023-2028", "Batch A"
  year: { type: String, default: 'Year 1' },
  semesters: [semesterSchema]
});

const courseSchema = new mongoose.Schema({
  enterpriseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Enterprise',
    required: true
  },
  name: { type: String, required: true }, // e.g. "BA LLB (Hons)", "LLM"
  code: { type: String, default: '' },
  durationYears: { type: Number, default: 5 },
  batches: [batchSchema],
  status: { type: String, enum: ['Active', 'Archived'], default: 'Active' }
}, { timestamps: true });

export default mongoose.model('EnterpriseAcademic', courseSchema);

import mongoose from 'mongoose';

const enterpriseSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  institutionType: {
    type: String,
    enum: ['University', 'Law College', 'Educational Institution'],
    default: 'University'
  },
  officialEmail: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  logo: {
    type: String,
    default: ''
  },
  website: {
    type: String,
    default: ''
  },
  expectedSeats: {
    type: Number,
    default: 100
  },
  facultyCount: {
    type: Number,
    default: 10
  },
  domains: [{
    domain: { type: String, required: true, lowercase: true, trim: true },
    status: {
      type: String,
      enum: ['Not Configured', 'Pending Verification', 'Verified', 'Failed'],
      default: 'Pending Verification'
    },
    verificationToken: { type: String, default: '' },
    verifiedAt: { type: Date }
  }],
  status: {
    type: String,
    enum: ['active', 'pending', 'suspended'],
    default: 'active'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  budget: {
    monthlyBudget: { type: Number, default: 50000 },
    usedAmount: { type: Number, default: 0 },
    alertThresholds: { type: [Number], default: [50, 75, 90, 100] },
    currency: { type: String, default: 'INR' }
  },
  aiCreditLimit: {
    monthlyLimit: { type: Number, default: 100000 },
    usedCredits: { type: Number, default: 0 },
    cycleResetDay: { type: Number, default: 1 }
  }
}, { timestamps: true });

export default mongoose.model('Enterprise', enterpriseSchema);

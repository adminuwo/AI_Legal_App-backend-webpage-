import mongoose from 'mongoose';

const organizationSchema = new mongoose.Schema({
  // Core Organization Identifiers
  organizationName: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  organizationSlug: {
    type: String,
    trim: true,
    lowercase: true,
    index: true
  },
  name: {
    type: String,
    trim: true
  },

  // Student Enrollment Details (Managed directly via Convee-Education)
  studentName: {
    type: String,
    trim: true
  },
  studentEmail: {
    type: String,
    trim: true,
    lowercase: true,
    index: true
  },
  studentId: {
    type: String,
    trim: true,
    index: true
  },
  className: {
    type: String,
    trim: true
  },
  department: {
    type: String,
    trim: true
  },

  // Specific Plan & Institutional Subscription (Managed directly via Convee-Education)
  plan: {
    planId: { 
      type: String, 
      default: 'convee_institutional' 
    },
    planName: { 
      type: String, 
      default: 'Convee Institutional Academic Plan' 
    },
    subscribed: { 
      type: Boolean, 
      default: true 
    },
    status: { 
      type: String, 
      enum: ['active', 'inactive', 'expired', 'suspended'], 
      default: 'active' 
    },
    startDate: { 
      type: Date, 
      default: Date.now 
    },
    expiryDate: { 
      type: Date, 
      default: () => new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) 
    },
    credits: { 
      type: Number, 
      default: 5000 
    }
  },

  // Direct / Top-Level Attributes
  credits: {
    type: Number,
    default: 5000
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'expired', 'suspended'],
    default: 'active',
    index: true
  },
  subscriptionExpiry: {
    type: Date
  },
  syncedAt: {
    type: Date,
    default: Date.now
  },
  source: {
    type: String,
    default: 'convee-education'
  },

  // Backward-compatibility attributes for existing Enterprise synchronization
  email: {
    type: String,
    trim: true,
    lowercase: true
  },
  officialEmail: {
    type: String,
    trim: true,
    lowercase: true
  },
  userEmail: {
    type: String,
    trim: true,
    lowercase: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { 
  timestamps: true 
});

// Composite indexing for quick lookups
organizationSchema.index({ organizationSlug: 1, studentEmail: 1 });
organizationSchema.index({ studentEmail: 1, status: 1 });

export default mongoose.models.Organization || mongoose.model('Organization', organizationSchema, 'organizations');
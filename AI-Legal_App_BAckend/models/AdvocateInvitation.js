import mongoose from 'mongoose';

const advocateInvitationSchema = new mongoose.Schema({
  invitedEmail: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    index: true,
  },
  invitedName: {
    type: String,
    trim: true,
    default: '',
  },
  invitedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  role: {
    type: String,
    default: 'advocate',
  },
  purpose: {
    type: String,
    default: 'verified_advocate_registration',
  },
  secureToken: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  status: {
    type: String,
    enum: ['invited', 'accepted', 'expired', 'revoked'],
    default: 'invited',
    index: true,
  },
  expiresAt: {
    type: Date,
    required: true,
    index: true,
  },
  acceptedAt: {
    type: Date,
    default: null,
  },
  consentAcceptedAt: {
    type: Date,
    default: null,
  },
  linkedUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  verificationStatus: {
    type: String,
    enum: ['pending', 'verified', 'rejected', null],
    default: null,
  },
  notes: {
    type: String,
    default: '',
  }
}, { timestamps: true });

advocateInvitationSchema.methods.isExpired = function() {
  return this.status === 'expired' || (this.expiresAt && new Date() > this.expiresAt);
};

advocateInvitationSchema.methods.isValid = function() {
  return this.status === 'invited' && !this.isExpired();
};

export default mongoose.model('AdvocateInvitation', advocateInvitationSchema);

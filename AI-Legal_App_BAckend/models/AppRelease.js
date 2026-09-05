import mongoose from 'mongoose';

const AppReleaseSchema = new mongoose.Schema(
  {
    platform: {
      type: String,
      enum: ['android', 'ios'],
      required: true,
    },
    version: {
      type: String,
      required: true,
      trim: true,
    },
    buildNumber: {
      type: Number,
      required: true,
      default: 1,
    },
    releaseType: {
      type: String,
      enum: ['Initial', 'Bug Fix', 'Feature', 'Security', 'Critical'],
      default: 'Feature',
    },
    releaseNotes: {
      type: String,
      default: '',
    },
    storeUrl: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['Draft', 'Released'],
      default: 'Released',
    },
    releasedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

export default mongoose.model('AppRelease', AppReleaseSchema);

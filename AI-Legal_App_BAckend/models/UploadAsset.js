import mongoose from 'mongoose';

const UploadAssetSchema = new mongoose.Schema({
  workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'SocialAgentWorkspace', required: true },
  assetType: { type: String, enum: ['logo', 'overview', 'calendar', 'reference_image', 'generated_content'] },
  gcsUrl: { type: String, required: true },
  fileName: { type: String, required: true },
  mimeType: { type: String },
  uploadedAt: { type: Date, default: Date.now }
});

export default mongoose.models.UploadAsset || mongoose.model('UploadAsset', UploadAssetSchema);

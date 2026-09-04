import mongoose from 'mongoose';

const CalendarEntrySchema = new mongoose.Schema({
  workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'SocialAgentWorkspace', required: true },
  calendarId: { type: mongoose.Schema.Types.ObjectId, ref: 'ContentCalendar', required: true },
  brand_id: String,
  date: String, // String representation for AI generated
  scheduledDate: Date, // Date object for manual or converted AI
  phase: String,
  platform: String,
  format: String,
  postType: String,
  post_type: String, // For legacy/compatibility
  title: String,
  contentType: String,
  heading_hook: String,
  hook: String,
  sub_heading: String,
  subHeading: String,
  short_caption: String,
  captionShort: String,
  long_caption: String,
  captionLong: String,
  postContent: String,
  hashtags: mongoose.Schema.Types.Mixed, // Supporting both String and Array
  breakdown: mongoose.Schema.Types.Mixed, // Supporting both String and Array
  platformTargets: [String],
  rawData: mongoose.Schema.Types.Mixed,
  status: {
    type: String,
    enum: ['pending', 'scheduled', 'generated', 'published', 'failed'],
    default: "pending"
  }
}, { timestamps: true });

export default mongoose.models.CalendarEntry || mongoose.model('CalendarEntry', CalendarEntrySchema);

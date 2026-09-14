import mongoose from 'mongoose';

const blogPostSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Article title is required'],
        trim: true,
        maxlength: [300, 'Title cannot exceed 300 characters']
    },
    slug: {
        type: String,
        required: [true, 'Slug is required'],
        unique: true,
        trim: true,
        lowercase: true
    },
    category: {
        type: String,
        required: [true, 'Category is required'],
        trim: true,
        default: 'Editorial & Updates'
    },
    author: {
        type: String,
        required: [true, 'Author name is required'],
        trim: true,
        default: 'AI LEGAL™ In-House Editorial Board'
    },
    authorRole: {
        type: String,
        trim: true,
        default: 'Legal Intelligence Team'
    },
    readTime: {
        type: String,
        default: '5 min read'
    },
    subtitle: {
        type: String,
        trim: true,
        default: ''
    },
    summary: {
        type: String,
        required: [true, 'Summary/Excerpt is required'],
        trim: true,
        maxlength: [1000, 'Summary cannot exceed 1000 characters']
    },
    description: {
        type: String,
        default: ''
    },
    content: {
        type: String,
        required: [true, 'Article content is required']
    },
    keywords: [{
        type: String,
        trim: true
    }],
    tags: [{
        type: String,
        trim: true
    }],
    image: {
        type: String,
        default: ''
    },
    coverImage: {
        type: String,
        default: ''
    },
    hasMobileDownload: {
        type: Boolean,
        default: false
    },
    isFeatured: {
        type: Boolean,
        default: false
    },
    status: {
        type: String,
        enum: ['Published', 'Draft'],
        default: 'Published'
    },
    source: {
        type: String,
        default: 'inhouse'
    }
}, {
    timestamps: true
});

// Index for search performance
blogPostSchema.index({ title: 'text', summary: 'text', content: 'text', category: 'text' });

const BlogPost = mongoose.model('BlogPost', blogPostSchema);

export default BlogPost;

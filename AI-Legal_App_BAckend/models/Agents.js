import mongoose from "mongoose";

const agentSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    avatar: {
        type: String,
        default: ""
    },
    category: {
        type: String,
        default: "productivity"
    },
    price: {
        type: Number,
        default: 0
    },
    instructions: {
        type: String,
        default: ""
    },
    status: {
        type: String,
        default: "active"
    }
}, { timestamps: true });

const Agent = mongoose.model("Agent", agentSchema);
export default Agent;

const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    user: { type: String, required: true },
    bot: { type: String, required: true }
  },
  { _id: false }
);

const chatSchema = new mongoose.Schema(
  {
    name: { type: String },
    email: { type: String },
    isPremium: { type: Boolean, default: false },

    algorithmSlug: { type: String, required: true },
    algorithmName: { type: String, required: true },

    // NEW: heading shown in sidebar
    chatTitle: { type: String, default: 'New Chat' },

    messages: { type: [messageSchema], default: [] },

    createdAt: { type: Date, default: Date.now }
  },
  { versionKey: false }
);

chatSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7 * 24 * 60 * 60 });
chatSchema.index({ email: 1, createdAt: -1 });
chatSchema.index({ algorithmSlug: 1, createdAt: -1 });

module.exports = mongoose.model('Chat', chatSchema);

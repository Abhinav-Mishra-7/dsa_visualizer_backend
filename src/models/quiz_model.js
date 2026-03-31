const mongoose = require('mongoose');

const quizSchema = new mongoose.Schema(
  {
    _id: String,
    algorithm: {
      type: String,
      required: true,
    },
    difficulty: {
      type: String,
      required: true,
    },
    question: {
      type: String,
      required: true,
    },
    options: {
      type: [String],
      required: true,
      validate: {
        validator: (v) => Array.isArray(v) && v.length >= 2,
        message: 'At least two options required',
      },
    },
    answer: {
      type: Number,
      required: true,
    },
    explanation: {
      type: String,
      default: '',
    },
  },
  {
    collection: 'quizzes',
    timestamps: true,
  }
);

module.exports = mongoose.model('Quiz', quizSchema);
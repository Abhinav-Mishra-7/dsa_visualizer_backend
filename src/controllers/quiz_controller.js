const Quiz = require('../models/quiz_model'); 

const mapQuizDocsToFrontendQuestions = (quizDocs) => {
  // Frontend expects an `id` per question (used as `questionId` in submit payloads).
  // We generate it deterministically based on sorted order.
  return quizDocs.map((q, idx) => ({
    ...q,
    id: idx + 1,
    // Frontend normalization will derive `correctIndex` from `answer`.
    // Keep `answer` as the correct option index.
    correctIndex: q?.correctIndex ?? q?.answer
  }));
};

const getQuiz = async (req, res) => {
  try {

    const { algorithm } = req.params;    
    const { subjectId, difficulty } = req.query;
    if (!algorithm) {
      return res.status(400).json({
        error: 'Algorithm is required in params',
        message: 'Algorithm is required in params'
      });
    }

    const filter = { algorithm };
    if (subjectId) filter.subject = subjectId;
    if (difficulty) filter.difficulty = difficulty;

    const quizDocs = await Quiz.find(filter).sort({ createdAt: 1 }).lean();
    if (!quizDocs || quizDocs.length === 0) {
      return res.status(404).json({
        error: 'No quizzes found for that algorithm',
        message: 'No quizzes found for that algorithm'
      });
    }

    const questions = mapQuizDocsToFrontendQuestions(quizDocs);
    // Shape expected by the frontend:
    // - `data.questions` OR `data.data.questions`
    return res.status(200).json({
      questions,
      data: { questions }
    });
  } catch (err) {
    console.error('getQuiz error:', err);
    res.status(500).json({
      error: 'Server error fetching quiz',
      message: 'Server error fetching quiz'
    });
  }
};

const verifyQuiz = async (req, res) => {
  try {
    const { algorithm, answers } = req.body || {};

    if (!algorithm || !Array.isArray(answers)) {
      return res.status(400).json({
        success: false,
        message: '`algorithm` and `answers` are required'
      });
    }

    const quizDocs = await Quiz.find({ algorithm })
      .sort({ createdAt: 1 })
      .lean();

    if (!quizDocs || quizDocs.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No quiz found for that algorithm'
      });
    }

    // Build a map: questionId -> selectedOptionIndex
    const answerByQuestionId = new Map();
    for (const a of answers) {
      const qid = Number(a?.questionId);
      const selectedRaw = a?.selectedOptionIndex;
      const selected = Number.isFinite(Number(selectedRaw))
        ? Number(selectedRaw)
        : -1;
      if (Number.isFinite(qid) && qid > 0) {
        answerByQuestionId.set(qid, selected);
      }
    }

    const results = quizDocs.map((q, idx) => {
      const questionId = idx + 1;
      const correctIndex = Number(q?.answer ?? q?.correctIndex ?? -1);
      const selectedOptionIndex = answerByQuestionId.get(questionId);

      const normalizedSelected =
        selectedOptionIndex === undefined ? -1 : selectedOptionIndex;

      const isCorrect =
        Number.isFinite(correctIndex) && normalizedSelected === correctIndex;

      return {
        questionId,
        correctIndex: Number.isFinite(correctIndex) ? correctIndex : -1,
        selectedOptionIndex: Number.isFinite(normalizedSelected)
          ? normalizedSelected
          : -1,
        isCorrect,
        explanation: q?.explanation ?? ''
      };
    });

    const correctCount = results.reduce(
      (acc, r) => acc + (r?.isCorrect ? 1 : 0),
      0
    );

    return res.status(200).json({
      success: true,
      score: {
        correct: correctCount,
        total: results.length
      },
      results
    });
  } catch (err) {
    console.error('verifyQuiz error:', err);
    return res.status(500).json({
      success: false,
      message: 'Quiz verification failed'
    });
  }
};

module.exports = {
  getQuiz,
  verifyQuiz
};
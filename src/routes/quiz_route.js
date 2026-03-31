const express = require('express');
const quizRouter =  express.Router();
const { getQuiz, verifyQuiz } = require('../controllers/quiz_controller');

quizRouter.get('/get-quiz/:algorithm', getQuiz) ;
quizRouter.post('/verify', verifyQuiz);

module.exports = quizRouter;
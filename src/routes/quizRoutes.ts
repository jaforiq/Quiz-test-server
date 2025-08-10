import express from 'express';
import {
  getQuestionsByStep,
  startAssessment,
  submitAnswer,
  completeStep,
  generateCertificate
} from '../controllers/quizController';
import { authenticateToken } from '../middleware/auth'; 

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get questions for a specific step
router.get('/questions/step/:step', getQuestionsByStep);

// Start new assessment
router.post('/assessment/start', startAssessment);

// Submit answer
router.post('/assessment/answer', submitAnswer);

// Complete step
router.post('/assessment/complete-step', completeStep);

// Generate certificate
router.post('/certificate/generate', generateCertificate);

export default router;

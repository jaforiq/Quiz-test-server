import mongoose from "mongoose";
import { RequestHandler } from "express";
import Question from '../models/Question';
import UserAnswer from '../models/UserAnswer';
import Certificate from '../models/Certificate';
import { AuthRequest } from '../middleware/auth'; 
import AssessmentSession from '../models/AssessmentSession';

// Get questions for a specific step
export const getQuestionsByStep: RequestHandler = async (req, res) => {
  try {
    const { step } = req.params;
    const stepNum = Number(step);
    if (!Number.isFinite(stepNum)) {
      res.status(400).json({ success: false, message: "Invalid step" });
      return; 
    }

    const userId = (req as AuthRequest).user?.sub; 
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    let levels: string[] | null = null;
    if (stepNum === 1) levels = ["A1", "A2"];
    else if (stepNum === 2) levels = ["B1", "B2"];
    else if (stepNum === 3) levels = ["C1", "C2"];
    if (!levels) {
      res.status(400).json({ success: false, message: "Invalid step" });
      return;
    }

    const questions = await Question.find({ level: { $in: levels } })
      .select("-correct_answer") 
      .sort({ level: 1, competency_id: 1, _id: 1 })
      .lean();

    res.status(200).json({
      success: true,
      data: { step: stepNum, levels, questions, total: questions.length },
    });
    return;
  } catch (error) {
    console.error("Error fetching questions:", error);
    res.status(500).json({ success: false, message: "Failed to fetch questions" });
  }
};

// Start new assessment session
export const startAssessment: RequestHandler = async (req, res) => {
  console.log("backend hits");
  try {
    const userId = (req as AuthRequest).user?.sub;
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    // Check existing in-progress session
    const activeSession = await AssessmentSession.findOne({
      user_id: userId,
      status: "in_progress",
    });

    console.log("active: ", activeSession);

    if (activeSession) {
      res.status(200).json({
        success: true,
        data: activeSession,
        message: "Active session found",
      });
      return; 
    }

    // Create new session
    const newSession = await AssessmentSession.create({
      user_id: userId,
      session_start: new Date(),
      current_step: 1,
      status: "in_progress",
      step_results: [],
    });

    res.status(201).json({
      success: true,
      data: newSession,
      message: "Assessment session started",
    });
    return;
  } catch (error) {
    console.error("Error starting assessment:", error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  }
};

// ---------- Submit answer ----------
export const submitAnswer: RequestHandler = async (req, res) => {
  try {
    const userId = (req as AuthRequest).user?.sub;
    if (!userId) { res.status(401).json({ success: false, message: "Unauthorized" }); return; }

    const { sessionId, questionId, userAnswer, timeSpent } = req.body as {
      sessionId: string; questionId: string; userAnswer: string; timeSpent?: number;
    };

    if (!sessionId || !questionId || typeof userAnswer !== "string") {
      res.status(400).json({ success: false, message: "Missing fields" }); return;
    }
    if (!mongoose.Types.ObjectId.isValid(sessionId) || !mongoose.Types.ObjectId.isValid(questionId)) {
      res.status(400).json({ success: false, message: "Invalid ids" }); return;
    }

    // session belongs to user?
    const session = await AssessmentSession.findOne({
      _id: sessionId, user_id: userId, status: "in_progress",
    });
    if (!session) { res.status(404).json({ success: false, message: "Session not found" }); return; }

    const question = await Question.findById(questionId).lean();
    if (!question) { res.status(404).json({ success: false, message: "Question not found" }); return; }

    const isCorrect = userAnswer === (question as any).correct_answer;

    await UserAnswer.create({
      session_id: session._id,
      step: session.current_step,
      question_id: questionId,
      user_answer: userAnswer,
      correct_answer: (question as any).correct_answer,
      is_correct: isCorrect,
      time_spent: typeof timeSpent === "number" ? timeSpent : undefined,
      answered_at: new Date(),
    });

    res.status(200).json({
      success: true,
      data: { is_correct: isCorrect, correct_answer: (question as any).correct_answer },
    });
  } catch (error) {
    console.error("Error submitting answer:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// ---------- Complete step ----------
export const completeStep: RequestHandler = async (req, res) => {
  try {
    const userId = (req as AuthRequest).user?.sub;
    if (!userId) { res.status(401).json({ success: false, message: "Unauthorized" }); return; }

    const { sessionId } = req.body as { sessionId: string };
    if (!sessionId || !mongoose.Types.ObjectId.isValid(sessionId)) {
      res.status(400).json({ success: false, message: "Invalid sessionId" }); return;
    }

    const session = await AssessmentSession.findOne({
      _id: sessionId, user_id: userId, status: "in_progress",
    });
    if (!session) { res.status(404).json({ success: false, message: "Session not found" }); return; }

    const stepAnswers = await UserAnswer.find({
      session_id: session._id, step: session.current_step,
    }).lean();

    if (stepAnswers.length === 0) {
      res.status(400).json({ success: false, message: "No answers for this step" }); return;
    }

    const correctAnswers = stepAnswers.filter(a => a.is_correct).length;
    const scorePercentage = (correctAnswers / stepAnswers.length) * 100;

    const certification = getCertification(scorePercentage, session.current_step);

    const levelsMap: Record<number, string[]> = {
      1: ["A1", "A2"],
      2: ["B1", "B2"],
      3: ["C1", "C2"],
    };

    const stepStart = session.session_start ?? new Date();
    const now = new Date();

    const stepResult = {
      step: session.current_step,
      levels_tested: levelsMap[session.current_step] ?? [],
      questions_attempted: stepAnswers.map(a => a.question_id.toString()),
      score_percentage: scorePercentage,
      certification_achieved: certification,
      step_start: stepStart,
      step_end: now,
      time_taken: Math.max(0, Math.floor((now.getTime() - stepStart.getTime()) / 1000)),
    };

    session.step_results.push(stepResult as any);

    // Progression logic
    if (session.current_step === 1) {
      if (scorePercentage < 25) {
        session.status = "failed";
        session.final_certification = "FAILED";
        session.session_end = now;
      } else if (scorePercentage >= 75) {
        session.current_step = 2;
      } else {
        session.status = "completed";
        session.final_certification = certification; // A1 or A2
        session.session_end = now;
      }
    } else if (session.current_step === 2) {
      if (scorePercentage >= 75) {
        session.current_step = 3;
      } else {
        session.status = "completed";
        session.final_certification = certification === "REMAIN_A2" ? "A2" : certification;
        session.session_end = now;
      }
    } else if (session.current_step === 3) {
      session.status = "completed";
      session.final_certification = certification === "REMAIN_B2" ? "B2" : certification;
      session.session_end = now;
    }

    await session.save();

    res.status(200).json({
      success: true,
      data: { step_result: stepResult, session, can_proceed: session.status === "in_progress" },
    });
  } catch (error) {
    console.error("Error completing step:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// ---------- Generate certificate ----------
export const generateCertificate: RequestHandler = async (req, res) => {
  try {
    const userId = (req as AuthRequest).user?.sub;
    if (!userId) { res.status(401).json({ success: false, message: "Unauthorized" }); return; }

    const { sessionId } = req.body as { sessionId: string };
    if (!sessionId || !mongoose.Types.ObjectId.isValid(sessionId)) {
      res.status(400).json({ success: false, message: "Invalid sessionId" }); return;
    }

    const session = await AssessmentSession.findOne({
      _id: sessionId, user_id: userId, status: "completed",
    }).lean();

    if (!session || session.final_certification === "FAILED") {
      res.status(400).json({ success: false, message: "Cannot generate certificate" }); return;
    }

    const existing = await Certificate.findOne({
      session_id: sessionId, user_id: userId,
    }).lean();

    if (existing) {
      res.status(200).json({ success: true, data: existing }); return;
    }

    const certificateNumber = generateCertificateNumber();
    const competenciesAssessed = Array.from({ length: 22 }, (_, i) => i + 1);

    const stepScores = (session.step_results ?? []).map((r: any) => r.score_percentage);
    const overall =
      stepScores.length > 0
        ? stepScores.reduce((acc: number, v: number) => acc + v, 0) / stepScores.length
        : 0;

    const cert = await Certificate.create({
      user_id: userId,
      session_id: sessionId,
      certificate_level: session.final_certification,
      certificate_number: certificateNumber,
      competencies_assessed: competenciesAssessed,
      overall_score: overall,
      step_scores: (session.step_results ?? []).map((r: any) => ({
        step: r.step,
        score_percentage: r.score_percentage,
        levels_covered: r.levels_tested,
      })),
    });

    res.status(200).json({ success: true, data: cert });
  } catch (error) {
    console.error("Error generating certificate:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// ---------- Helpers ----------
const getCertification = (score: number, step: number): string => {
  if (step === 1) {
    if (score < 25) return "FAIL";
    if (score < 50) return "A1";
    if (score < 75) return "A2";
    return "A2_ADVANCE";
  }
  if (step === 2) {
    if (score < 25) return "REMAIN_A2";
    if (score < 50) return "B1";
    if (score < 75) return "B2";
    return "B2_ADVANCE";
  }
  if (step === 3) {
    if (score < 25) return "REMAIN_B2";
    if (score < 50) return "C1";
    return "C2";
  }
  return "FAIL";
};

const generateCertificateNumber = (): string =>
  `CERT-${Math.random().toString(36).slice(2, 11).toUpperCase()}-${Date.now().toString().slice(-6)}`;

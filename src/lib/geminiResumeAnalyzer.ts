/**
 * Gemini AI Integration for Candidate Resume Scoring & Before Interview Screening
 * Uses Google Gemini API with multimodal / structured JSON evaluation.
 */

export interface InspectedCodeLine {
  lineNum: number;
  code: string;
  isAi: boolean;
  annotation?: string;
}

export interface InspectedCodeFile {
  id: string;
  fileName: string;
  language: string;
  repoSource: string;
  humanPercentage: number;
  aiPercentage: number;
  totalLines: number;
  summary: string;
  signals: string[];
  lines: InspectedCodeLine[];
}

export interface GeminiAnalysisResult {
  resumeScore: number;
  atsBreakdown: {
    roleAlignment: number;
    skillsMatch: number;
    projectImpact: number;
    formatting: number;
    missingKeywords: string[];
    actionableSuggestions: string[];
  };
  matchedKeywords: string[];
  missingKeywords: string[];
  resumeFeedback: string;
  authenticityPercentage: number;
  aiWrittenPercentage: number;
  githubFeedback: string;
  codeSignals: string[];
  inspectedCodeFiles?: InspectedCodeFile[];
  generatedMCQs: {
    id: number;
    question: string;
    options: string[];
    correctIndex: number;
    topic: string;
    repoSource: string;
    rationale: string;
  }[];
  repoCodingChallenges: {
    id: number;
    title: string;
    repoContext: string;
    problemStatement: string;
    starterCode: string;
    testCases: { input: string; expectedOutput: string }[];
  }[];
  hrEvidence: {
    overallRecommendation: "Strong Hire" | "Hire with Coaching" | "Consider" | "Needs Further Technical Evaluation";
    summary: string;
    strengths: string[];
    areasToVerify: string[];
    decisionNotes: string;
  };
}

export const getGeminiApiKey = (): string => {
  return (
    localStorage.getItem("hz_gemini_api_key") ||
    (import.meta as any).env?.VITE_GEMINI_API_KEY ||
    ""
  );
};

export const setGeminiApiKey = (key: string): void => {
  if (key) {
    localStorage.setItem("hz_gemini_api_key", key.trim());
  } else {
    localStorage.removeItem("hz_gemini_api_key");
  }
};

/**
 * Perform comprehensive Before Interview analysis using Gemini AI
 */
export async function analyzeBeforeInterviewWithGemini(
  job: {
    title: string;
    requiredSkills: string[];
    description: string;
    resumeCutoff: number;
    githubCutoff: number;
    projectCutoff: number;
  },
  candidate: {
    name: string;
    resumeText: string;
    githubUrl: string;
    projectDetails: string;
  },
  customApiKey?: string
): Promise<GeminiAnalysisResult | null> {
  const apiKey = customApiKey || getGeminiApiKey();

  if (!apiKey) {
    console.warn("No Gemini API key found. Using deterministic fallback engine.");
    return null;
  }

  const prompt = `You are a world-class Technical Hiring Screener and ATS (Applicant Tracking System) Engine for top tech companies.
Your job is to rigorously evaluate a candidate application against the target job posting across 4 stages.

CRITICAL SCORING RULE:
- If the candidate's resume/bio demonstrates matching technologies, stacks, and relevant development experience for the required skills (${job.requiredSkills.join(", ")}), the ATS resumeScore MUST accurately reflect high match (92% - 98%).
- Only assign a score below the 90% cutoff if key required technical skills are completely absent or mismatched.
- Provide a fair, realistic, and highly accurate ATS breakdown.

====================
TARGET JOB POSTING
====================
Title: ${job.title}
Required Skills: ${job.requiredSkills.join(", ")}
Resume Cutoff Score: ${job.resumeCutoff || 90}%
GitHub Cutoff: ${job.githubCutoff || 80}%
Job Description: ${job.description}

====================
CANDIDATE SUBMISSION
====================
Name: ${candidate.name}
Resume / Experience Summary:
${candidate.resumeText}

GitHub Profile / Repositories:
${candidate.githubUrl}

Project Summary & Architecture:
${candidate.projectDetails}

====================
REQUIRED JSON OUTPUT SCHEMA
====================
{
  "resumeScore": <number between 0 and 100. If skills match the job, score must be >= 90 (e.g. 92-96). If skills mismatch, score < 90>,
  "atsBreakdown": {
    "roleAlignment": <number 0-100>,
    "skillsMatch": <number 0-100>,
    "projectImpact": <number 0-100>,
    "formatting": <number 0-100>,
    "missingKeywords": [<list of missing tech skills if any, or empty array if strong match>],
    "actionableSuggestions": [<2-3 concrete suggestions to improve ATS compatibility>]
  },
  "matchedKeywords": [<list of matched skills found in resume>],
  "missingKeywords": [<list of missing skills from job requirement>],
  "resumeFeedback": <clear 1-2 sentence summary of resume ATS fit>,
  "authenticityPercentage": <number 75-96 for verified human code, or lower if boilerplate detected>,
  "aiWrittenPercentage": <100 - authenticityPercentage>,
  "githubFeedback": <evaluation of GitHub repository code quality and commit depth>,
  "codeSignals": [<3 technical signals like "Modular repository pattern", "Verified domain assertions", "Clean commit lineage">],
  "inspectedCodeFiles": [
    {
      "id": "file-1",
      "fileName": "src/services/auth_validator.ts",
      "language": "typescript",
      "repoSource": "candidate-repo",
      "humanPercentage": 88,
      "aiPercentage": 12,
      "totalLines": 18,
      "summary": "Core authentication token validation and rate limiting logic.",
      "signals": ["Custom token expiration handling", "Manual Redis cache lookup", "Zero boilerplate duplication"],
      "lines": [
        { "lineNum": 1, "code": "import { Request, Response, NextFunction } from 'express';", "isAi": true, "annotation": "Standard framework import boilerplate" },
        { "lineNum": 2, "code": "import { verifyToken, decodeClaims } from '../lib/crypto';", "isAi": false, "annotation": "Domain crypto module link" },
        { "lineNum": 3, "code": "export async function authValidator(req: Request, res: Response, next: NextFunction) {", "isAi": true, "annotation": "Middleware handler signature" },
        { "lineNum": 4, "code": "  const authHeader = req.headers['authorization'];", "isAi": false, "annotation": "Direct header extraction" },
        { "lineNum": 5, "code": "  if (!authHeader || !authHeader.startsWith('Bearer ')) {", "isAi": false, "annotation": "Strict boundary verification" },
        { "lineNum": 6, "code": "    return res.status(401).json({ error: 'Missing or malformed Authorization header' });", "isAi": false, "annotation": "Explicit security rejection" },
        { "lineNum": 7, "code": "  }", "isAi": false, "annotation": "" },
        { "lineNum": 8, "code": "  const token = authHeader.split(' ')[1];", "isAi": false, "annotation": "Token slice logic" },
        { "lineNum": 9, "code": "  const claims = await verifyToken(token);", "isAi": false, "annotation": "Cryptographic payload resolution" },
        { "lineNum": 10, "code": "  if (!claims || claims.exp < Date.now() / 1000) {", "isAi": false, "annotation": "Custom epoch expiry check" },
        { "lineNum": 11, "code": "    return res.status(403).json({ error: 'Token expired or invalid signature' });", "isAi": false, "annotation": "Security guard rail" },
        { "lineNum": 12, "code": "  }", "isAi": false, "annotation": "" },
        { "lineNum": 13, "code": "  (req as any).user = claims;", "isAi": true, "annotation": "Context attachment boilerplate" },
        { "lineNum": 14, "code": "  return next();", "isAi": false, "annotation": "Pipeline handover" },
        { "lineNum": 15, "code": "}", "isAi": false, "annotation": "" }
      ]
    }
  ],
  "generatedMCQs": [
    {
      "id": 1,
      "question": <technical scenario question based on candidate GitHub repo tech stack>,
      "options": [<option A>, <option B>, <option C>, <option D>],
      "correctIndex": <0-3>,
      "topic": <topic name>,
      "repoSource": <repo filename like "server/auth_middleware.ts">,
      "rationale": <why the correct answer is right>
    },
    // ... exactly 5 total MCQs
  ],
  "repoCodingChallenges": [
    {
      "id": 1,
      "title": <challenge title based on candidate stack>,
      "repoContext": <e.g. "Derived from candidate repo / data_pipeline.ts">,
      "problemStatement": <clear problem statement with input/output description>,
      "starterCode": <valid starter function template>,
      "testCases": [
        { "input": <sample input>, "expectedOutput": <sample expected output> },
        { "input": <sample input 2>, "expectedOutput": <sample expected output 2> }
      ]
    },
    {
      "id": 2,
      "title": <second practical challenge>,
      "repoContext": <context>,
      "problemStatement": <problem statement>,
      "starterCode": <starter function template>,
      "testCases": [
        { "input": <input 1>, "expectedOutput": <output 1> },
        { "input": <input 2>, "expectedOutput": <output 2> }
      ]
    }
  ],
  "hrEvidence": {
    "overallRecommendation": "Strong Hire" | "Hire with Coaching" | "Consider" | "Needs Further Technical Evaluation",
    "summary": <concise summary for HR recruiter>,
    "strengths": [<2-3 key strengths>],
    "areasToVerify": [<1-2 technical areas for live interview>],
    "decisionNotes": <screening decision note>
  }
}

Respond ONLY with the JSON object. No Markdown code fences or extra text.`;

  const models = ["gemini-1.5-flash", "gemini-2.0-flash", "gemini-2.5-flash", "gemini-1.5-pro"];

  for (const model of models) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [{ text: prompt }],
              },
            ],
            generationConfig: {
              temperature: 0.2,
              responseMimeType: "application/json",
            },
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.warn(`Gemini model ${model} failed (${response.status}):`, errorText);
        continue;
      }

      const data = await response.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) continue;

      let cleanJson = rawText.trim();
      if (cleanJson.startsWith("```json")) {
        cleanJson = cleanJson.slice(7);
      } else if (cleanJson.startsWith("```")) {
        cleanJson = cleanJson.slice(3);
      }
      if (cleanJson.endsWith("```")) {
        cleanJson = cleanJson.slice(0, -3);
      }
      cleanJson = cleanJson.trim();

      const parsed: GeminiAnalysisResult = JSON.parse(cleanJson);
      return parsed;
    } catch (e) {
      console.warn(`Error calling Gemini model ${model}:`, e);
    }
  }

  return null;
}

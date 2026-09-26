/**
 * Gemini AI Integration for Candidate Resume Scoring & Before Interview Screening
 * Uses Google Gemini API with multimodal / structured JSON evaluation.
 */

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
  aiInterviewDialogue: {
    turn: number;
    topic: string;
    question: string;
    candidateAnswer: string;
    aiEvaluation: {
      demonstratedKnowledge: string;
      confidence: number;
      gapFound: string | null;
      adaptiveFollowUp: string;
    };
  }[];
  skillMap: {
    skill: string;
    category: string;
    status: "Demonstrated" | "Developing" | "Needs Improvement" | "Not Assessed";
    evidenceNote: string;
  }[];
  improvementPlan: {
    priority: "High" | "Medium" | "Low";
    area: string;
    recommendation: string;
    suggestedAction: string;
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

  const prompt = `You are an expert technical ATS resume and code evaluator for high-growth tech teams.
Analyze the following candidate's application against the target job requirements and return a valid JSON object matching the requested schema.

====================
TARGET JOB POSTING
====================
Title: ${job.title}
Required Skills: ${job.requiredSkills.join(", ")}
Resume Cutoff Score: ${job.resumeCutoff}%
GitHub Cutoff: ${job.githubCutoff}%
Job Description: ${job.description}

====================
CANDIDATE SUBMISSION
====================
Name: ${candidate.name}
Resume Text / Bio:
${candidate.resumeText}

GitHub Profile / Repositories:
${candidate.githubUrl}

Project Details:
${candidate.projectDetails}

====================
EVALUATION INSTRUCTIONS
====================
1. ATS RESUME MATCH (0-100):
   - Calculate resumeScore based on keyword density, depth of experience in required skills, and demonstrable outcomes.
   - Break down into roleAlignment (0-100), skillsMatch (0-100), projectImpact (0-100), formatting (0-100).
   - Identify matchedKeywords and missingKeywords. Provide 2-3 actionable suggestions.

2. GITHUB & CODE AUTHENTICITY:
   - Estimate authenticityPercentage (e.g. 75-95% for solid human code) and aiWrittenPercentage (100 - authenticityPercentage).
   - Extract 3 technical codeSignals.

3. 5 PERSONALIZED MCQS:
   - Generate 5 deep technical multiple-choice questions tailored to the candidate's exact repository stacks and job requirements.
   - Include 4 options, the 0-indexed correctIndex, topic, repoSource file name, and rationale.

4. 2 REPO-DERIVED PRACTICAL CODING CHALLENGES:
   - Create 2 algorithmic/engineering challenges reflecting candidate's stack with starterCode and 2 testCases.

5. DYNAMIC AI INTERVIEW DIALOGUE:
   - Generate 3 turns of conversational technical probing with question, realistic candidateAnswer, AI evaluation, knowledge demonstrated, boundaries detected, and adaptive follow-up.

6. SKILL MAP & IMPROVEMENT PLAN:
   - 4-6 categorized skills with statuses ("Demonstrated" | "Developing" | "Needs Improvement").
   - 3 prioritized improvement items (High, Medium, Low) with concrete recommendations and suggested actions.

7. HR EVIDENCE SYNTHESIS:
   - overallRecommendation ("Strong Hire" | "Hire with Coaching" | "Consider" | "Needs Further Technical Evaluation").
   - summary, strengths, areasToVerify, decisionNotes.

Respond ONLY with a valid JSON object without markdown fences or additional commentary.`;

  const models = ["gemini-2.5-flash", "gemini-1.5-flash", "gemini-flash-latest", "gemini-3.8-flash"];

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

      const parsed: GeminiAnalysisResult = JSON.parse(rawText);
      return parsed;
    } catch (e) {
      console.warn(`Error calling Gemini model ${model}:`, e);
    }
  }

  return null;
}

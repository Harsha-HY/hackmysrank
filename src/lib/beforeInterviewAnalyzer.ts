/**
 * HireZap Pre-Interview AI Candidate Analyzer Engine
 * Evaluates Resume ATS, GitHub Code Authenticity & AI-Generated Estimation,
 * and Project Architecture Suitability before candidates proceed to tests/interviews.
 */

export interface PreInterviewAnalysis {
  id: string;
  applicationId: string;
  candidateName: string;
  candidateEmail?: string;
  targetRole: string;
  appliedDate: string;
  overallPreScore: number; // 0-100 weighted fit score
  status: "ready_for_test" | "review_needed" | "low_match";

  // 1. ATS & Resume Analysis
  atsAnalysis: {
    score: number; // 0-100
    roleAlignment: number; // percentage
    matchedKeywords: string[];
    missingKeywords: string[];
    formattingScore: number;
    summaryVerdict: string;
  };

  // 2. GitHub Code & AI Generation Estimation
  githubAnalysis: {
    handle: string;
    repoUrl?: string;
    languages: { name: string; percentage: number; color: string }[];
    techStackMatched: string[];
    codeQualityScore: number; // 0-100
    aiGeneratedEstimation: {
      aiGeneratedPercent: number; // e.g. 15%
      authenticityPercent: number; // e.g. 85%
      signalLevel: "Low AI (Authentic)" | "Moderate AI-Assisted" | "High AI-Generated";
      explanation: string;
    };
    inspectedSignals: string[];
    verificationAreas: string[];
  };

  // 3. Project Suitability & Architecture
  projectAnalysis: {
    title: string;
    projectUrl?: string;
    complexityScore: number; // 0-100
    detectedArchitecture: string;
    techStackClaimed: string[];
    functionalityVerified: boolean;
    interviewTopicRecommendations: string[];
  };

  // 4. Recommendation for Recruiter
  recruiterRecommendation: {
    decision: "Shortlist for Assessment" | "Request Additional Evidence" | "Reject";
    reasons: string[];
  };
}

export const SAMPLE_PRE_INTERVIEW_ANALYSES: Record<string, PreInterviewAnalysis> = {
  "cand-cv-01": {
    id: "pre-cv-01",
    applicationId: "app-01",
    candidateName: "Aarav Sharma",
    candidateEmail: "aarav.sharma@example.com",
    targetRole: "Senior Software Engineer (AI & Computer Vision)",
    appliedDate: "Today, 10:30 AM",
    overallPreScore: 89,
    status: "ready_for_test",
    atsAnalysis: {
      score: 88,
      roleAlignment: 92,
      matchedKeywords: ["Python", "OpenCV", "PyTorch", "FastAPI", "Docker", "Edge AI", "Computer Vision"],
      missingKeywords: ["Redis", "Distributed Caching", "Kubernetes"],
      formattingScore: 90,
      summaryVerdict: "Strong alignment with computer vision and edge deployment requirements.",
    },
    githubAnalysis: {
      handle: "aarav-cv-labs",
      repoUrl: "https://github.com/aarav-cv-labs/face-guard-attendance",
      languages: [
        { name: "Python", percentage: 74, color: "#3572A5" },
        { name: "C++", percentage: 18, color: "#f34b7d" },
        { name: "Shell", percentage: 8, color: "#89e051" },
      ],
      techStackMatched: ["Python", "OpenCV", "PyTorch", "FastAPI"],
      codeQualityScore: 91,
      aiGeneratedEstimation: {
        aiGeneratedPercent: 12,
        authenticityPercent: 88,
        signalLevel: "Low AI (Authentic)",
        explanation: "Commit history shows natural iterative development over 8 months with authentic unit tests, custom frame buffer threading, and personalized edge quantization scripts.",
      },
      inspectedSignals: [
        "Threaded OpenCV video capture pipeline reducing buffer lag.",
        "Custom eye-blink ratio & texture analysis anti-spoofing layer.",
        "ONNX FP16 quantization export scripts present in repository.",
      ],
      verificationAreas: [
        "Verify batching technique for face embedding queries under high concurrency.",
        "Check edge memory stability during long RTSP video ingestion.",
      ],
    },
    projectAnalysis: {
      title: "FaceGuard: Enterprise Biometric Attendance",
      projectUrl: "https://github.com/aarav-cv-labs/face-guard-attendance",
      complexityScore: 88,
      detectedArchitecture: "Edge Video Ingest -> MTCNN Haar Filter -> FaceNet Tensor Batch -> Vector Cosine Match",
      techStackClaimed: ["Python", "OpenCV", "PyTorch", "FastAPI", "SQLite"],
      functionalityVerified: true,
      interviewTopicRecommendations: [
        "OpenCV streaming buffer lag mitigation techniques",
        "Anti-spoofing texture analysis frequency domain math",
        "HNSW vector indexing for edge devices",
      ],
    },
    recruiterRecommendation: {
      decision: "Shortlist for Assessment",
      reasons: [
        "High ATS match (88/100) with strong domain depth in OpenCV/PyTorch.",
        "Verified repository code authenticity (88% authentic / 12% AI boilerplate).",
        "Project architecture directly aligns with the company's video AI initiative.",
      ],
    },
  },

  "cand-fs-02": {
    id: "pre-fs-02",
    applicationId: "app-02",
    candidateName: "Priya Patel",
    candidateEmail: "priya.patel@example.com",
    targetRole: "Senior Fullstack Engineer (React & Cloud)",
    appliedDate: "Yesterday, 04:15 PM",
    overallPreScore: 92,
    status: "ready_for_test",
    atsAnalysis: {
      score: 92,
      roleAlignment: 95,
      matchedKeywords: ["React", "TypeScript", "Node.js", "PostgreSQL", "Redis", "WebSockets", "CRDT"],
      missingKeywords: ["gRPC", "Kubernetes"],
      formattingScore: 92,
      summaryVerdict: "Exceptional match with fullstack TypeScript and real-time distributed architecture.",
    },
    githubAnalysis: {
      handle: "priya-dev-cloud",
      repoUrl: "https://github.com/priya-dev-cloud/collab-board-engine",
      languages: [
        { name: "TypeScript", percentage: 68, color: "#3178c6" },
        { name: "Go", percentage: 20, color: "#00ADD8" },
        { name: "SQL", percentage: 12, color: "#e38c00" },
      ],
      techStackMatched: ["React", "TypeScript", "Node.js", "Redis", "PostgreSQL"],
      codeQualityScore: 94,
      aiGeneratedEstimation: {
        aiGeneratedPercent: 10,
        authenticityPercent: 90,
        signalLevel: "Low AI (Authentic)",
        explanation: "Repository demonstrates clean domain-driven architecture with comprehensive Jest & Playwright test coverage. Commit messages reflect genuine architectural refactoring.",
      },
      inspectedSignals: [
        "Yjs CRDT state synchronization over WebSockets with Redis adapter.",
        "Optimistic UI rendering pipeline with client-side conflict resolution.",
        "Strict PostgreSQL SERIALIZABLE transaction wrappers for ledger balance integrity.",
      ],
      verificationAreas: [
        "Handling network partition reconnect storms with large delta payloads.",
        "Memory footprint of long-lived CRDT documents in Node.js heap.",
      ],
    },
    projectAnalysis: {
      title: "CollabBoard: Realtime Infinite Canvas",
      projectUrl: "https://github.com/priya-dev-cloud/collab-board-engine",
      complexityScore: 94,
      detectedArchitecture: "React Canvas UI -> Zustand State -> Yjs CRDT -> Node.js Cluster -> Redis PubSub",
      techStackClaimed: ["React", "TypeScript", "Zustand", "Yjs", "Node.js", "Redis"],
      functionalityVerified: true,
      interviewTopicRecommendations: [
        "React rendering isolation for high-frequency cursor updates",
        "Redis Pub/Sub message deduplication and horizontal scaling",
        "PostgreSQL double-entry ledger idempotency",
      ],
    },
    recruiterRecommendation: {
      decision: "Shortlist for Assessment",
      reasons: [
        "Top-tier ATS match (92/100) with deep mastery of TypeScript/React/Node.js.",
        "Outstanding code authenticity (90% authentic) and robust testing suite.",
        "Proven real-time system design with Yjs CRDTs and Redis backplane.",
      ],
    },
  },
};

export function getPreInterviewAnalysis(candidateId?: string | null): PreInterviewAnalysis {
  if (candidateId && SAMPLE_PRE_INTERVIEW_ANALYSES[candidateId]) {
    return SAMPLE_PRE_INTERVIEW_ANALYSES[candidateId];
  }
  return SAMPLE_PRE_INTERVIEW_ANALYSES["cand-cv-01"];
}

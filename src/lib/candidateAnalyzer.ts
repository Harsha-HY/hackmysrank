/**
 * HireZap Candidate AI Analyzer & Assessment Engine
 * Defines candidate data models, ATS scoring, GitHub analysis,
 * 5-MCQ generator, adaptive DSA sets, AI interview probing, and HR evidence.
 */

export interface CandidateProfile {
  id: string;
  name: string;
  avatar: string;
  targetRole: string;
  experienceLevel: string;
  headline: string;
  resumeSummary: string;
  claimedSkills: string[];
  atsScore: number;
  atsBreakdown: {
    roleAlignment: number;
    skillsMatch: number;
    projectImpact: number;
    formatting: number;
    missingKeywords: string[];
    actionableSuggestions: string[];
  };
  githubProfile: {
    handle: string;
    reposCount: number;
    topLanguages: { lang: string; percentage: number; color: string }[];
    inspectedRepos: {
      name: string;
      description: string;
      stars: number;
      techStack: string[];
      codeSignals: string[];
      verificationAreas: string[];
    }[];
    integritySignal: string;
  };
  projects: {
    title: string;
    description: string;
    technologies: string[];
    claimedFunctionality: string;
    architectureDetected: string[];
    verificationQuestions: string[];
  }[];
  personalizedMCQs: {
    id: number;
    question: string;
    options: string[];
    correctIndex: number;
    topic: string;
    rationale: string;
    intersectionSource: string; // e.g. "Job Requirements + OpenCV Resume + Attendance Project"
  }[];
  dsaRound1: {
    id: number;
    title: string;
    difficulty: "Easy" | "Medium" | "Hard";
    description: string;
    starterCode: string;
    testCases: { input: string; output: string; passed: boolean }[];
    approachSignal: string;
    timeComplexity: string;
  }[];
  dsaRound2Adaptive: {
    id: number;
    title: string;
    difficulty: "Medium" | "Hard";
    adaptedFromReason: string;
    description: string;
    starterCode: string;
    testCases: { input: string; output: string; passed: boolean }[];
    approachSignal: string;
    timeComplexity: string;
  };
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

export const HIREZAP_12_STEPS = [
  {
    step: 1,
    title: "HR Creates Job & Hiring Stages",
    actor: "HR Team",
    description: "Select role, experience tier, core competencies, and custom hiring stages.",
    icon: "Briefcase",
  },
  {
    step: 2,
    title: "Candidate Profile & Evidence Submission",
    actor: "Candidate",
    description: "Submit resume, GitHub handle, and live project repositories/links.",
    icon: "UserCheck",
  },
  {
    step: 3,
    title: "AI Candidate Analyzer",
    actor: "AI Engine",
    description: "Parses resume ATS compatibility, checks GitHub repositories, and scans projects.",
    icon: "ScanSearch",
  },
  {
    step: 4,
    title: "Candidate-Specific Skill Profile",
    actor: "AI Engine",
    description: "Synthesizes claimed abilities with tangible GitHub & project evidence into a baseline profile.",
    icon: "Fingerprint",
  },
  {
    step: 5,
    title: "Personalized Technical Test (5 MCQs)",
    actor: "Assessment Engine",
    description: "Generated from the exact intersection of Job Requirements + Candidate Skills + Project Evidence.",
    icon: "ListChecks",
  },
  {
    step: 6,
    title: "DSA Round 1 (2 Problems)",
    actor: "Coding Sandbox",
    description: "Role-appropriate algorithm problems evaluating correctness, edge cases, and code efficiency.",
    icon: "Code2",
  },
  {
    step: 7,
    title: "Adaptive DSA Round 2",
    actor: "Adaptive AI",
    description: "Dynamically adapts difficulty and problem category based on Round 1 performance and weak areas.",
    icon: "GitBranch",
  },
  {
    step: 8,
    title: "Project / GitHub Code Validation",
    actor: "Validation Engine",
    description: "Validates code structure, dependencies, and architectural assertions from candidate's repos.",
    icon: "GitPullRequest",
  },
  {
    step: 9,
    title: "Personalized AI Project Interview",
    actor: "Dynamic AI Interviewer",
    description: "Dynamic conversational interview where subsequent questions probe candidate's specific answers.",
    icon: "Bot",
  },
  {
    step: 10,
    title: "Communication / GD Round",
    actor: "Interactive Room",
    description: "Optional proctored video reading, speaking balance, and group discussion signals.",
    icon: "Video",
  },
  {
    step: 11,
    title: "Evidence & Scorecard Consolidation",
    actor: "Evidence Engine",
    description: "Combines verified signals into a candidate transparent scorecard and comprehensive HR report.",
    icon: "FileSpreadsheet",
  },
  {
    step: 12,
    title: "HR Review & Final Decision",
    actor: "HR / Hiring Manager",
    description: "HR reviews explainable evidence, verified competencies, and makes the final hiring choice.",
    icon: "Award",
  },
];

export const DEMO_CANDIDATES: Record<string, CandidateProfile> = {
  candidateA: {
    id: "cand-cv-01",
    name: "Aarav Sharma",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
    targetRole: "Senior Software Engineer (AI & Computer Vision)",
    experienceLevel: "3.5 Years",
    headline: "Computer Vision Engineer | Python, OpenCV, PyTorch, Edge ML Pipelines",
    resumeSummary: "Built biometric face-recognition attendance systems, real-time edge inference pipelines with OpenCV/PyTorch, and distributed model serving in FastAPI.",
    claimedSkills: ["Python", "OpenCV", "PyTorch", "FastAPI", "Docker", "SQL", "Edge Deployment"],
    atsScore: 88,
    atsBreakdown: {
      roleAlignment: 92,
      skillsMatch: 86,
      projectImpact: 84,
      formatting: 90,
      missingKeywords: ["Distributed Caching", "Redis", "CI/CD Pipeline"],
      actionableSuggestions: [
        "Quantify edge model latency improvements (e.g., 'reduced inference latency by 42% on Jetson Nano').",
        "Add explicit mention of SQL query optimization & indexing in backend data layers.",
        "Clarify CI/CD deployment pipelines used for edge device fleet management.",
      ],
    },
    githubProfile: {
      handle: "aarav-cv-labs",
      reposCount: 18,
      topLanguages: [
        { lang: "Python", percentage: 74, color: "#3572A5" },
        { lang: "C++", percentage: 18, color: "#f34b7d" },
        { lang: "Shell", percentage: 8, color: "#89e051" },
      ],
      inspectedRepos: [
        {
          name: "face-guard-attendance",
          description: "Real-time multi-face recognition attendance tracker using MTCNN & FaceNet with Anti-Spoofing.",
          stars: 42,
          techStack: ["Python", "OpenCV", "PyTorch", "FastAPI", "SQLite"],
          codeSignals: [
            "Custom OpenCV frame pre-processing & Haar/MTCNN bounding box normalizers.",
            "Liveness detection using eye-blink ratio & texture analysis (anti-spoofing).",
            "Threaded video capture pipeline to prevent frame buffer drops.",
          ],
          verificationAreas: [
            "Handling lighting condition variations & severe occlusion.",
            "Batching face embedding vectors for high-throughput sub-millisecond queries.",
          ],
        },
        {
          name: "edge-object-tracker",
          description: "DeepSORT + YOLOv8 optimized for low-power edge devices.",
          stars: 29,
          techStack: ["Python", "C++", "ONNXRuntime", "TensorRT"],
          codeSignals: [
            "ONNX export with FP16 quantization.",
            "Kalman filter tracking state management.",
          ],
          verificationAreas: [
            "Memory buffer leak prevention during long-running RTSP video streams.",
          ],
        },
      ],
      integritySignal: "High repository commit density; authentic original commit history and active PR discussions verified.",
    },
    projects: [
      {
        title: "FaceGuard: Enterprise Biometric Attendance",
        description: "AI-driven edge attendance terminal processing 500+ employees with anti-spoofing and offline sync.",
        technologies: ["Python", "OpenCV", "PyTorch", "FastAPI", "PostgreSQL"],
        claimedFunctionality: "Sub-500ms face matching with 99.2% accuracy under varying illumination.",
        architectureDetected: [
          "Edge Frame Capture -> Haar Cascade Pre-filter -> Deep Embedding Extraction -> Vector Search -> Event Queue",
        ],
        verificationQuestions: [
          "How did you prevent false positives from photo prints / screen spoofing?",
          "What approach did you take when ambient lighting drops below 20 lux?",
          "How does the embedding indexing scale when employee count grows to 50,000?",
        ],
      },
    ],
    personalizedMCQs: [
      {
        id: 1,
        question: "In OpenCV video capture pipelines, what is the primary architectural cause of frame-lag accumulation during high-load inference, and how do you mitigate it?",
        options: [
          "VideoCapture buffer overflows; decouple capture into a dedicated daemon thread that continually consumes and stores only the latest frame.",
          "Image encoding converts BGR to RGB on CPU; use GPU-only shaders for all image channel operations.",
          "Garbage collection in Python freezes the camera driver; disable GC using gc.disable() during streaming.",
          "TCP packet loss on RTSP stream; convert RTSP to raw UDP frames unconditionally.",
        ],
        correctIndex: 0,
        topic: "OpenCV Streaming Architecture",
        rationale: "Decoupling frame grabbing from CPU/GPU model inference using a background thread reading buffer prevents stale frame buildup.",
        intersectionSource: "JD Video Processing Req + Resume 'Edge Video Pipelines' + 'face-guard-attendance' Repo",
      },
      {
        id: 2,
        question: "When applying face anti-spoofing texture analysis, which frequency domain technique is commonly employed to distinguish physical skin from smartphone screen reflections?",
        options: [
          "Fourier Transform high-frequency spectral cutoff & Local Binary Pattern (LBP) variance analysis.",
          "Histogram Equalization followed by morphological erosion.",
          "Bilinear interpolation upsampling on the alpha channel.",
          "K-Means color segmentation on HSV hue channel.",
        ],
        correctIndex: 0,
        topic: "Anti-Spoofing & Computer Vision",
        rationale: "Screen reflections exhibit high-frequency moiré patterns and distinct LBP texture histograms compared to diffuse 3D human skin reflection.",
        intersectionSource: "JD Robust CV Systems + Project 'FaceGuard Anti-Spoofing claim'",
      },
      {
        id: 3,
        question: "To achieve sub-millisecond vector similarity search across 50,000 512-dimensional face embeddings on a localized edge device, which index is best suited?",
        options: [
          "HNSW (Hierarchical Navigable Small World) with cosine distance metric.",
          "Brute-force Euclidean distance matrix on every request.",
          "B-Tree index over concatenated float strings in SQLite.",
          "Full-text search (FTS5) inverted indexing.",
        ],
        correctIndex: 0,
        topic: "Vector Search & Embeddings",
        rationale: "HNSW graphs provide logarithmic search complexity with high recall for high-dimensional embeddings on memory-constrained devices.",
        intersectionSource: "JD Scalable AI Architectures + Resume 'Fast Face Retrieval'",
      },
      {
        id: 4,
        question: "When quantizing a PyTorch vision model from FP32 to INT8 via TensorRT/ONNX Runtime, what is the key purpose of the calibration dataset?",
        options: [
          "To compute activation distribution histograms and calculate optimal scale & zero-point parameters without retraining.",
          "To fine-tune weight gradients using backpropagation.",
          "To augment training samples with Gaussian noise.",
          "To convert dynamic batch sizes into fixed scalar integers.",
        ],
        correctIndex: 0,
        topic: "Model Quantization & Edge Optimization",
        rationale: "Post-training calibration runs forward passes on representative data to calculate min/max activation thresholds for accurate INT8 dynamic range mapping.",
        intersectionSource: "JD Model Optimization + GitHub 'edge-object-tracker' ONNX quantized signals",
      },
      {
        id: 5,
        question: "In a FastAPI edge service handling concurrent video stream ingestion, why is using a standard synchronous OpenCV `cv2.imread` inside an `async def` route problematic?",
        options: [
          "It blocks the main asyncio event loop thread, preventing all other concurrent HTTP and WebSocket connections from being serviced.",
          "It causes OpenCV memory to automatically deallocate upon route return.",
          "Asyncio cannot convert numpy arrays to JSON responses.",
          "FastAPI requires all image arrays to be transmitted as Base64 strings.",
        ],
        correctIndex: 0,
        topic: "Asynchronous Backend Concurrency",
        rationale: "Synchronous blocking IO in `async def` routes halts the single-threaded asyncio event loop; IO-bound or CPU-bound tasks must run in thread pools or regular `def` workers.",
        intersectionSource: "JD High-throughput API + Resume 'FastAPI Inference Service'",
      },
    ],
    dsaRound1: [
      {
        id: 1,
        title: "1. Maximum Bounding Box Intersection Area (Intervals)",
        difficulty: "Medium",
        description: "Given a list of 2D bounding boxes represented as [x1, y1, x2, y2], find the maximum overlapping region area across any concurrent cluster.",
        starterCode: `def max_overlap_box(boxes: list[list[int]]) -> int:\n    # Write your solution here\n    pass`,
        testCases: [
          { input: "boxes = [[0,0,4,4],[2,2,6,6],[1,1,3,3]]", output: "1", passed: true },
          { input: "boxes = [[0,0,2,2],[3,3,5,5]]", output: "0", passed: true },
          { input: "boxes = [[0,0,10,10],[2,2,8,8],[3,3,7,7]]", output: "16", passed: true },
        ],
        approachSignal: "Used 2D sweep-line interval decomposition with coordinate compression.",
        timeComplexity: "O(N log N)",
      },
      {
        id: 2,
        title: "2. LRU Cache for High-Frequency Frame Embeddings",
        difficulty: "Medium",
        description: "Design an LRU Cache with capacity K supporting get(key) and put(key, embedding) in O(1) time.",
        starterCode: `class LRUEmbeddingCache:\n    def __init__(self, capacity: int):\n        pass\n    def get(self, key: str) -> list[float]:\n        pass\n    def put(self, key: str, value: list[float]) -> None:\n        pass`,
        testCases: [
          { input: "capacity=2, put('f1',[0.1]), put('f2',[0.2]), get('f1')", output: "[0.1]", passed: true },
          { input: "put('f3',[0.3]), get('f2')", output: "None (evicted)", passed: true },
        ],
        approachSignal: "Implemented Doubly Linked List + Hash Map correctly with constant time re-linking.",
        timeComplexity: "O(1) get and put",
      },
    ],
    dsaRound2Adaptive: {
      id: 3,
      title: "Adaptive DSA Round 2: K-Nearest Image Embeddings in Streaming Window",
      difficulty: "Hard",
      adaptedFromReason: "Candidate achieved 100% test pass on Round 1 with fast O(N log N) interval logic. Adapting to test advanced heap/priority queue algorithms with real-time sliding window constraints.",
      description: "Given a continuous stream of vector points and a query point, maintain top K nearest neighbors dynamically within a sliding window of size W.",
      starterCode: `class StreamingKNN:\n    def __init__(self, k: int, window_size: int):\n        pass\n    def add_point(self, point_id: int, vector: list[float]) -> None:\n        pass\n    def get_top_k(self, query: list[float]) -> list[int]:\n        pass`,
      testCases: [
        { input: "k=2, window=3, points added: p1, p2, p3, query=[0,0]", output: "[p1, p2]", passed: true },
        { input: "point added: p4 (p1 expires), query=[0,0]", output: "[p2, p4]", passed: true },
      ],
      approachSignal: "Maintained max-heap of size K alongside deque for timestamp invalidation. Clean approach.",
      timeComplexity: "O(W log K)",
    },
    aiInterviewDialogue: [
      {
        turn: 1,
        topic: "Face Recognition Pipeline Architecture",
        question: "In your FaceGuard repository, I noticed you use MTCNN for face detection and FaceNet embeddings. How did you handle latency bottlenecks when multiple individuals step into the camera frame simultaneously?",
        candidateAnswer: "We separated face detection and embedding extraction into asynchronous workers. For detection, we downscaled the frame to 480p for MTCNN bounding box extraction, and then cropped the bounding box regions from the full-resolution buffer to send into FaceNet in a single batched tensor pass rather than sequential single-face inferences.",
        aiEvaluation: {
          demonstratedKnowledge: "Demonstrated strong grasp of batched tensor throughput and frame resolution tradeoffs.",
          confidence: 0.94,
          gapFound: null,
          adaptiveFollowUp: "Great. How did you handle anti-spoofing on those cropped batches without introducing latency spikes?",
        },
      },
      {
        turn: 2,
        topic: "Anti-Spoofing & Edge Constraints",
        question: "How did you implement anti-spoofing without blowing past your 500ms edge latency target?",
        candidateAnswer: "We used a lightweight 2-tier check: first a fast blink and eye aspect ratio (EAR) check over 3 consecutive frames. If inconclusive, we passed the face crop into a small MobileNetV2 classifier trained on texture reflection patterns. Both run in under 45ms on CPU.",
        aiEvaluation: {
          demonstratedKnowledge: "Excellent progressive-filtering pattern (heuristics first, neural fallback).",
          confidence: 0.92,
          gapFound: "Did not specify handling of varying ambient illumination (e.g. backlighting / darkness).",
          adaptiveFollowUp: "What happens when illumination is extremely uneven or backlit, causing the EAR threshold to fail?",
        },
      },
      {
        turn: 3,
        topic: "Low-Light & Backlight Robustness",
        question: "When ambient lighting drops or backlighting washes out facial landmarks, how does your system adapt?",
        candidateAnswer: "We added adaptive histogram equalization (CLAHE) on the luminance (Y) channel in YCrCb color space before landmark detection. If average intensity is still below threshold, the UI prompts the user to adjust position or turns on the device LED auxiliary light.",
        aiEvaluation: {
          demonstratedKnowledge: "Understands YCrCb color space transformations and CLAHE contrast enhancement.",
          confidence: 0.96,
          gapFound: null,
          adaptiveFollowUp: "System verified. Ready for summary report.",
        },
      },
    ],
    skillMap: [
      { skill: "Computer Vision (OpenCV/MTCNN)", category: "Domain Expertise", status: "Demonstrated", evidenceNote: "Verified through custom frame batching code in GitHub + 100% score on MCQ 1 & 2." },
      { skill: "Edge Model Optimization (ONNX/TensorRT)", category: "Deep Learning", status: "Demonstrated", evidenceNote: "Accurately explained INT8 calibration and quantized tensor export." },
      { skill: "Data Structures & Algorithms", category: "Core CS", status: "Demonstrated", evidenceNote: "Solved Round 1 intervals + successfully solved Adaptive Round 2 Streaming KNN (Hard)." },
      { skill: "Asynchronous Backend (FastAPI)", category: "Software Engineering", status: "Demonstrated", evidenceNote: "Demonstrated clear understanding of asyncio non-blocking thread pool execution." },
      { skill: "SQL Query Optimization", category: "Data Systems", status: "Developing", evidenceNote: "Basic relational schema used in project; complex query indexing not tested in depth." },
      { skill: "Distributed System Scaling (Kafka/Redis)", category: "Architecture", status: "Needs Improvement", evidenceNote: "Current projects rely on single-node SQLite/Postgres without distributed queue evidence." },
      { skill: "Cloud Kubernetes Deployment", category: "DevOps", status: "Not Assessed", evidenceNote: "Not present in project evidence; role was edge-terminal focused." },
    ],
    improvementPlan: [
      {
        priority: "High",
        area: "Distributed Queuing & Scalability",
        recommendation: "Study and implement distributed event streams (e.g., Apache Kafka / Redis Streams) for multi-camera video feed ingestion across multiple edge nodes.",
        suggestedAction: "Build a prototype multi-camera ingest pipeline sending metadata to Redis Streams with consumer groups.",
      },
      {
        priority: "Medium",
        area: "Database Query Indexing",
        recommendation: "Deepen understanding of PostgreSQL partial indexes and composite indexing strategies for high-frequency time-series attendance logging.",
        suggestedAction: "Write and benchmark EXPLAIN ANALYZE queries on 10M+ attendance records.",
      },
      {
        priority: "Low",
        area: "CI/CD & Cloud Orchestration",
        recommendation: "Add automated Docker container build and OTA update deployment pipelines via GitHub Actions.",
        suggestedAction: "Implement GitHub Actions workflow building multi-arch ARM64/AMD64 Docker images.",
      },
    ],
    hrEvidence: {
      overallRecommendation: "Strong Hire",
      summary: "Aarav demonstrated verified mastery in computer vision architectures, edge inference optimization, and algorithmic problem solving. His GitHub code for 'FaceGuard' was authenticated with deep domain knowledge during adaptive probing.",
      strengths: [
        "Architectural clarity: designed non-blocking batched video processing pipelines with sub-500ms latency.",
        "Exceptional DSA proficiency: solved both Round 1 problems and adaptive Round 2 Streaming KNN.",
        "Strong integrity signals: authentic GitHub commit timeline matching spoken technical interview depth.",
      ],
      areasToVerify: [
        "Experience with cloud distributed microservices is limited to edge architectures; recommend pairing with a senior backend architect on distributed scale tasks.",
      ],
      decisionNotes: "Exceeds bar for Senior AI/CV Engineer. Candidate scorecard and evidence recommend advancing to offer stage.",
    },
  },

  candidateB: {
    id: "cand-fs-02",
    name: "Priya Patel",
    avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80",
    targetRole: "Senior Fullstack Engineer (React, Node.js, Distributed Cloud)",
    experienceLevel: "4 Years",
    headline: "Fullstack Architect | React, TypeScript, Node.js, PostgreSQL, Redis, Microservices",
    resumeSummary: "Engineered scalable multi-tenant SaaS platforms, real-time collaboration canvas with WebSockets & CRDTs, and distributed transactional payment processing.",
    claimedSkills: ["TypeScript", "React", "Node.js", "PostgreSQL", "Redis", "Docker", "GraphQL", "WebSockets"],
    atsScore: 92,
    atsBreakdown: {
      roleAlignment: 95,
      skillsMatch: 94,
      projectImpact: 90,
      formatting: 92,
      missingKeywords: ["Rust", "Kubernetes", "gRPC"],
      actionableSuggestions: [
        "Highlight database sharding or partitioning strategies in large PostgreSQL tables.",
        "Add metrics on WebSocket concurrent connection limits achieved in production.",
      ],
    },
    githubProfile: {
      handle: "priya-dev-cloud",
      reposCount: 24,
      topLanguages: [
        { lang: "TypeScript", percentage: 68, color: "#3178c6" },
        { lang: "Go", percentage: 20, color: "#00ADD8" },
        { lang: "SQL", percentage: 12, color: "#e38c00" },
      ],
      inspectedRepos: [
        {
          name: "collab-board-engine",
          description: "Real-time collaborative whiteboard using Yjs CRDTs, WebSockets, and Redis pub/sub backplane.",
          stars: 87,
          techStack: ["TypeScript", "React", "Node.js", "Redis", "PostgreSQL"],
          codeSignals: [
            "Yjs document synchronization over WebSocket rooms with Redis adapter.",
            "Optimistic UI updates with client-side conflict resolution.",
            "Cursor presence broadcast with throttling to reduce network chatter.",
          ],
          verificationAreas: [
            "Handling network partition reconnect storms with large delta payloads.",
            "Memory footprint of long-lived active CRDT state in Node.js server memory.",
          ],
        },
        {
          name: "fintech-payment-ledger",
          description: "Double-entry bookkeeping system with idempotent transaction processing in PostgreSQL.",
          stars: 56,
          techStack: ["Node.js", "TypeScript", "PostgreSQL", "Docker"],
          codeSignals: [
            "Strict SERIALIZABLE transaction isolation and idempotency keys.",
            "Database constraint-enforced balance integrity.",
          ],
          verificationAreas: [
            "Deadlock mitigation strategies under high concurrency on hot accounts.",
          ],
        },
      ],
      integritySignal: "Comprehensive test suites (Jest/Playwright); clean modular Clean Architecture with verified authorship.",
    },
    projects: [
      {
        title: "CollabBoard: Realtime Infinite Canvas",
        description: "High-performance collaborative canvas serving 10,000+ simultaneous editors with zero-conflict document sync.",
        technologies: ["React", "TypeScript", "Zustand", "Yjs CRDT", "Node.js", "Redis"],
        claimedFunctionality: "Sub-16ms render loop on 50,000 canvas elements with offline-first synchronization.",
        architectureDetected: [
          "React Canvas UI -> Zustand State -> Yjs CRDT Provider -> Node.js Cluster -> Redis PubSub Layer",
        ],
        verificationQuestions: [
          "How did you prevent React re-renders from degrading framerate on huge canvases?",
          "How does Redis pub/sub handle cross-pod WebSocket state synchronization?",
          "What strategy prevents duplicate transaction writes during network timeouts?",
        ],
      },
    ],
    personalizedMCQs: [
      {
        id: 1,
        question: "In a real-time collaborative canvas built with CRDTs (e.g. Yjs) and React, how do you prevent re-rendering the entire canvas tree on every remote cursor coordinate update?",
        options: [
          "Separate transient cursor state from document state; update cursor DOM positions directly or via isolated memoized overlays outside React's main canvas render loop.",
          "Use React.useMemo around every single shape component in the tree unconditionally.",
          "Serialize the entire state to JSON and diff using deep equality before each frame.",
          "Throttle the WebSocket incoming frame rate to 2 updates per second.",
        ],
        correctIndex: 0,
        topic: "High-Performance React & Real-time State",
        rationale: "Cursors are high-frequency transient data; isolating them into separate lightweight overlays avoids costly re-renders of heavy canvas elements.",
        intersectionSource: "JD Frontend Performance + Resume 'Real-time Canvas' + 'collab-board-engine' Repo",
      },
      {
        id: 2,
        question: "When scaling WebSocket servers horizontally behind a load balancer with Redis Pub/Sub, how do you prevent message amplification loops where a server re-broadcasts a message back to Redis?",
        options: [
          "Attach a unique `originServerId` or message UUID to each published envelope, and discard incoming Redis messages if origin matches the receiver.",
          "Ensure each user only connects to a single master server with no pub/sub backplane.",
          "Encrypt WebSocket payloads with TLS so Redis cannot inspect contents.",
          "Convert all WebSockets to long-polling HTTP requests.",
        ],
        correctIndex: 0,
        topic: "Distributed Real-time Architecture",
        rationale: "Tagging messages with server instance identifiers enables filter guards preventing echo loops across distributed pub/sub bridges.",
        intersectionSource: "JD Distributed Systems + GitHub 'collab-board-engine' Redis PubSub signals",
      },
      {
        id: 3,
        question: "In a PostgreSQL double-entry bookkeeping ledger, how do you reliably achieve idempotency for payment requests that might be retried upon network timeout?",
        options: [
          "Store unique client-generated Idempotency-Keys in a table with a UNIQUE constraint, inserted within the same database transaction as the ledger entry.",
          "Rely on client timestamps to check if a transaction occurred within the last 5 seconds.",
          "Use Redis cache without persistence to store payment IDs.",
          "Execute payments in autocommit mode without transaction wrappers.",
        ],
        correctIndex: 0,
        topic: "Financial Data Integrity & PostgreSQL",
        rationale: "Enforcing idempotency via atomic relational database constraints inside the ledger transaction guarantees that duplicate network retries fail or return cached responses safely.",
        intersectionSource: "JD Data Integrity + 'fintech-payment-ledger' Project",
      },
      {
        id: 4,
        question: "What is the primary trade-off between Optimistic Locking (`version` column) and Pessimistic Locking (`SELECT FOR UPDATE`) in PostgreSQL under high-contention row updates?",
        options: [
          "Optimistic locking avoids database lock contention and works best when conflicts are rare, but causes client retry storms under high contention; Pessimistic locking guarantees immediate sequential ordering at the expense of holding row locks.",
          "Optimistic locking requires distributed ZooKeeper coordination; pessimistic locking does not.",
          "Pessimistic locking consumes zero database memory connections.",
          "Optimistic locking can only be used with MongoDB, not PostgreSQL.",
        ],
        correctIndex: 0,
        topic: "Database Concurrency Control",
        rationale: "Optimistic locking is lightweight for low conflict; high contention creates excessive retry churn where pessimistic lock queues provide deterministic ordering.",
        intersectionSource: "JD Database Scalability + Resume 'Transactional Ledger'",
      },
      {
        id: 5,
        question: "When designing a Node.js microservice handling streaming large file uploads to S3, how do you prevent High Memory Watermark / OOM crashes?",
        options: [
          "Pipe the incoming HTTP request stream directly to the multipart upload stream with backpressure handling, avoiding buffering chunks in RAM.",
          "Increase `max-old-space-size` to 16GB so all files fit in memory.",
          "Convert file chunks to base64 strings and save to temporary JSON files.",
          "Use `fs.readFileSync` inside a while loop.",
        ],
        correctIndex: 0,
        topic: "Node.js Streams & Memory Management",
        rationale: "Streaming with backpressure ensures that slow consumer rates pause upstream data reads, maintaining a constant bounded memory buffer.",
        intersectionSource: "JD Node.js Performance + Resume 'Scalable Microservices'",
      },
    ],
    dsaRound1: [
      {
        id: 1,
        title: "1. Distributed Rate Limiter (Token Bucket with Sliding Window)",
        difficulty: "Medium",
        description: "Implement a sliding window log rate limiter allowing max R requests per window W per client IP.",
        starterCode: `class SlidingWindowRateLimiter:\n    def __init__(self, max_requests: int, window_seconds: int):\n        pass\n    def allow_request(self, client_id: str, timestamp: int) -> bool:\n        pass`,
        testCases: [
          { input: "max=3, window=10, reqs at t=[1,2,3,4]", output: "True, True, True, False", passed: true },
          { input: "req at t=12 (t=1 expired)", output: "True", passed: true },
        ],
        approachSignal: "Used sorted set deque with timestamp pruning. Clean O(log N) state management.",
        timeComplexity: "O(K) per check where K is requests in window",
      },
      {
        id: 2,
        title: "2. Flatten Nested Microservice Dependency Graph with Cycle Detection",
        difficulty: "Medium",
        description: "Given a directed graph of microservice dependencies, return a valid deployment execution order or detect if a cyclic dependency exists.",
        starterCode: `def deployment_order(services: dict[str, list[str]]) -> list[str]:\n    # Return order or empty list if cyclic\n    pass`,
        testCases: [
          { input: "{'A': ['B', 'C'], 'B': ['D'], 'C': ['D'], 'D': []}", output: "['D', 'B', 'C', 'A']", passed: true },
          { input: "{'A': ['B'], 'B': ['C'], 'C': ['A']}", output: "[] (Cycle Detected)", passed: true },
        ],
        approachSignal: "Implemented Kahn's Algorithm (Topological Sort with in-degree tracking) seamlessly.",
        timeComplexity: "O(V + E)",
      },
    ],
    dsaRound2Adaptive: {
      id: 3,
      title: "Adaptive DSA Round 2: Distributed Consistent Hashing Ring with Virtual Nodes",
      difficulty: "Hard",
      adaptedFromReason: "Candidate demonstrated rapid mastery of distributed rate limiting and graph topological sorting in Round 1. Adapting to test consistent hashing algorithms with virtual node distribution.",
      description: "Implement a Consistent Hashing ring supporting add_node, remove_node, and get_node for key routing with uniform distribution across virtual replicas.",
      starterCode: `class ConsistentHashRing:\n    def __init__(self, replicas: int = 100):\n        pass\n    def add_node(self, node: str) -> None:\n        pass\n    def remove_node(self, node: str) -> None:\n        pass\n    def get_node(self, key: str) -> str:\n        pass`,
      testCases: [
        { input: "nodes=['server1','server2'], key='user_492'", output: "'server2'", passed: true },
        { input: "remove_node('server2'), key='user_492'", output: "'server1'", passed: true },
      ],
      approachSignal: "Used binary search (bisect) over sorted hash ring array with MD5 virtual node tagging.",
      timeComplexity: "O(log(N * R)) per lookup",
    },
    aiInterviewDialogue: [
      {
        turn: 1,
        topic: "CRDT Conflict Resolution & WebSocket Backplane",
        question: "In CollabBoard, how did you handle state synchronization when two users simultaneously modify the same canvas shape while one user experiences a 2-second network disconnect?",
        candidateAnswer: "We utilized Yjs Y.Map CRDT types for shape attributes. Yjs uses Lamport timestamps and unique client IDs to deterministically resolve concurrent attribute writes without central server arbitration. When the disconnected client reconnects, it sends its local update vector, receives only missing state deltas, and merges seamlessly.",
        aiEvaluation: {
          demonstratedKnowledge: "Deep understanding of CRDT state vectors, delta updates, and Lamport causality.",
          confidence: 0.98,
          gapFound: null,
          adaptiveFollowUp: "How did you prevent Redis memory exhaustion with thousands of active rooms?",
        },
      },
      {
        turn: 2,
        topic: "Redis Pub/Sub & Memory Management",
        question: "When rooms are active for days, how do you handle CRDT document compaction so Redis and Node memory do not continually grow?",
        candidateAnswer: "We implement scheduled snapshotting. Every 15 minutes of idle time or 500 operations, the Node server merges the Yjs transaction log into a single compressed binary state vector and commits it to PostgreSQL, then trims the Redis transaction log stream.",
        aiEvaluation: {
          demonstratedKnowledge: "Solid persistent checkpointing & log truncation pattern.",
          confidence: 0.95,
          gapFound: "Did not detail how in-flight updates during snapshot write are protected from data race.",
          adaptiveFollowUp: "What happens if an update arrives right while the snapshot write to Postgres is in flight?",
        },
      },
      {
        turn: 3,
        topic: "Snapshot Concurrency Protection",
        question: "How do you guarantee that updates arriving during the PostgreSQL snapshot write are not dropped or double-applied?",
        candidateAnswer: "We maintain a monotonically increasing snapshot revision number. In-flight operations carry a higher revision counter and remain in the active buffer. After Postgres writes revision N, only buffers up to revision N are cleared.",
        aiEvaluation: {
          demonstratedKnowledge: "Clear comprehension of revision-tagged buffer drainage.",
          confidence: 0.97,
          gapFound: null,
          adaptiveFollowUp: "System verified. Ready for summary report.",
        },
      },
    ],
    skillMap: [
      { skill: "Frontend Architecture (React/TypeScript)", category: "Frontend", status: "Demonstrated", evidenceNote: "Verified through CRDT canvas implementation and 100% score on MCQ 1 & 2." },
      { skill: "Distributed Systems & Realtime (WebSockets/Redis)", category: "Backend", status: "Demonstrated", evidenceNote: "Demonstrated advanced mastery in Redis Pub/Sub, horizontal scaling, and message deduplication." },
      { skill: "Data Structures & Algorithms", category: "Core CS", status: "Demonstrated", evidenceNote: "Solved Round 1 Rate Limiter + Topological Sort, and passed Adaptive Round 2 Consistent Hashing." },
      { skill: "Database Transactions & PostgreSQL", category: "Data Systems", status: "Demonstrated", evidenceNote: "Strong command of SERIALIZABLE isolation, idempotency keys, and optimistic concurrency." },
      { skill: "Kubernetes & Container Orchestration", category: "DevOps", status: "Developing", evidenceNote: "Docker setups present; multi-cluster service mesh & Helm not fully demonstrated." },
      { skill: "GraphQL Schema Design", category: "API Design", status: "Developing", evidenceNote: "Claimed in resume; basic schema present but REST/WebSockets was the primary focus." },
      { skill: "Low-level Systems Programming (Rust/C++)", category: "Systems", status: "Not Assessed", evidenceNote: "Not evaluated for this Fullstack TypeScript/Node role." },
    ],
    improvementPlan: [
      {
        priority: "High",
        area: "Kubernetes Cloud Deployment",
        recommendation: "Gain deeper practical experience writing Helm charts, HPA autoscaling policies, and ingress controllers for Node.js WebSocket workloads on Kubernetes.",
        suggestedAction: "Deploy CollabBoard cluster on a local Minikube/Kind cluster with Traefik ingress and Redis Sentinel.",
      },
      {
        priority: "Medium",
        area: "GraphQL Federation",
        recommendation: "Explore Apollo Federation or GraphQL Mesh for composing distributed microservice schemas.",
        suggestedAction: "Refactor backend entity graphs into federated subgraphs.",
      },
      {
        priority: "Low",
        area: "Load Testing & Chaos Engineering",
        recommendation: "Implement automated chaos testing with Chaos Mesh or k6 to stress test WebSocket reconnection storms.",
        suggestedAction: "Create a k6 benchmark script simulating 20,000 concurrent WebSocket connections.",
      },
    ],
    hrEvidence: {
      overallRecommendation: "Strong Hire",
      summary: "Priya exhibited world-class competencies in frontend performance, distributed WebSocket real-time systems, and transactional data integrity. Her collaborative whiteboard project code was thoroughly verified with outstanding responses during adaptive probing.",
      strengths: [
        "Exceptional fullstack engineering: flawless understanding of CRDT state synchronization and React rendering lifecycles.",
        "High-caliber system design: solved consistent hashing and distributed rate limiting with precision.",
        "Clean coding discipline: authenticated repository architecture with thorough testing methodology.",
      ],
      areasToVerify: [
        "Infrastructure is Docker-centric; provide lightweight orientation on internal Kubernetes production deployment workflows.",
      ],
      decisionNotes: "Strongly recommended for Lead/Senior Fullstack Engineer. Candidate demonstrated top 5% performance across all 12 stages.",
    },
  },
};

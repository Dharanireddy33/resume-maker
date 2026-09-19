const TECH_SKILLS = [
  'python', 'java', 'javascript', 'typescript', 'react', 'angular', 'vue', 'node', 'express',
  'sql', 'mysql', 'postgresql', 'mongodb', 'redis', 'aws', 'azure', 'gcp', 'docker', 'kubernetes',
  'git', 'github', 'ci/cd', 'jenkins', 'terraform', 'ansible', 'linux', 'bash', 'shell',
  'c++', 'c#', 'go', 'rust', 'ruby', 'php', 'swift', 'kotlin', 'scala', 'r', 'matlab',
  'html', 'css', 'sass', 'tailwind', 'bootstrap', 'jquery', 'redux', 'graphql', 'rest api',
  'rest', 'soap', 'microservices', 'kafka', 'rabbitmq', 'elasticsearch', 'spark', 'hadoop',
  'pandas', 'numpy', 'scikit-learn', 'tensorflow', 'pytorch', 'keras', 'opencv', 'nlp',
  'machine learning', 'deep learning', 'data science', 'data analysis', 'tableau', 'power bi',
  'excel', 'jira', 'agile', 'scrum', 'devops', 'cybersecurity', 'networking', 'tcp/ip',
  'django', 'flask', 'fastapi', 'spring', 'spring boot', 'dotnet', '.net', 'laravel',
  'html5', 'css3', 'webpack', 'vite', 'jest', 'cypress', 'selenium', 'postman',
];

const SOFT_SKILLS = [
  'communication', 'teamwork', 'leadership', 'problem solving', 'critical thinking',
  'time management', 'adaptability', 'collaboration', 'creativity', 'analytical',
  'organization', 'attention to detail', 'interpersonal', 'presentation', 'negotiation',
  'decision making', 'conflict resolution', 'mentoring', 'project management', 'strategic planning',
];

const ALL_SKILLS = [...TECH_SKILLS, ...SOFT_SKILLS];

const SECTION_KEYWORDS: Record<string, string[]> = {
  experience: ['experience', 'work history', 'employment', 'professional experience', 'career', 'internship', 'intern'],
  education: ['education', 'academic', 'degree', 'university', 'college', 'school', 'bachelor', 'master', 'phd', 'b.tech', 'm.tech', 'b.e', 'm.e'],
  projects: ['projects', 'project work', 'personal projects', 'academic projects'],
  skills: ['skills', 'technical skills', 'soft skills', 'core competencies', 'technologies'],
  certifications: ['certifications', 'certificates', 'certified', 'license', 'licensed'],
  summary: ['summary', 'objective', 'profile summary', 'professional summary', 'about me', 'career objective'],
  contact: ['contact', 'email', 'phone', 'address', 'linkedin', 'github', 'portfolio'],
};

function tokenize(text: string): string[] {
  return text.toLowerCase().split(/[^a-z0-9+#.]+/).filter((t) => t.length > 1);
}

function extractEmail(text: string): string | null {
  const match = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  return match ? match[0] : null;
}

function extractPhone(text: string): string | null {
  const match = text.match(/(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3,4}[-.\s]?\d{4}/);
  return match ? match[0].trim() : null;
}

function extractName(text: string): string | null {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  for (const line of lines.slice(0, 5)) {
    if (line.length > 2 && line.length < 50 && /^[A-Z][a-zA-Z]+(\s+[A-Z][a-zA-Z]+){1,3}$/.test(line)) {
      return line;
    }
  }
  return null;
}

function findSkills(text: string): { technical: string[]; soft: string[] } {
  const lower = text.toLowerCase();
  const technical = TECH_SKILLS.filter((s) => {
    const regex = new RegExp(`\\b${s.replace(/[.*+?^${}()|[\]\\#]/g, '\\$&')}\\b`, 'i');
    return regex.test(lower);
  });
  const soft = SOFT_SKILLS.filter((s) => lower.includes(s));
  return { technical: [...new Set(technical)], soft: [...new Set(soft)] };
}

function findSections(text: string): Record<string, boolean> {
  const lower = text.toLowerCase();
  const sections: Record<string, boolean> = {};
  for (const [section, keywords] of Object.entries(SECTION_KEYWORDS)) {
    sections[section] = keywords.some((kw) => lower.includes(kw));
  }
  return sections;
}

function countKeywords(text: string): number {
  const tokens = tokenize(text);
  const keywordSet = new Set(ALL_SKILLS);
  return tokens.filter((t) => keywordSet.has(t)).length;
}

export interface LocalAnalysisResult {
  name: string | null;
  email: string | null;
  phone: string | null;
  technical_skills: string[];
  soft_skills: string[];
  sections_found: Record<string, boolean>;
  keyword_count: number;
  ats_score: number;
  keyword_score: number;
  skills_score: number;
  experience_score: number;
  education_score: number;
  suggestions: string[];
  missing_keywords: string[];
  structure_feedback: Record<string, string>;
}

export function analyzeResumeLocally(resumeText: string): LocalAnalysisResult {
  if (!resumeText || resumeText.trim().length < 50) {
    throw new Error('The resume text is too short or empty. Please upload a valid resume.');
  }

  const name = extractName(resumeText);
  const email = extractEmail(resumeText);
  const phone = extractPhone(resumeText);
  const { technical, soft } = findSkills(resumeText);
  const sections = findSections(resumeText);
  const keywordCount = countKeywords(resumeText);

  const wordCount = resumeText.split(/\s+/).length;

  const skillsScore = Math.min(100, technical.length * 8 + soft.length * 5);
  const keywordScore = Math.min(100, keywordCount * 5);
  const experienceScore = sections.experience ? 85 : 30;
  const educationScore = sections.education ? 90 : 40;

  const structureFeedback: Record<string, string> = {};
  if (!sections.summary) structureFeedback.summary = 'Consider adding a professional summary at the top of your resume.';
  if (!sections.contact) structureFeedback.contact = 'Ensure your contact information (email, phone, LinkedIn) is clearly visible.';
  if (!sections.projects) structureFeedback.projects = 'Adding a projects section can strengthen your resume.';
  if (!sections.certifications) structureFeedback.certifications = 'If you have certifications, list them in a dedicated section.';
  if (!sections.skills) structureFeedback.skills = 'Create a clearly labeled skills section for better ATS parsing.';

  const suggestions: string[] = [];
  if (technical.length < 5) suggestions.push('Add more technical skills to improve keyword matching with ATS systems.');
  if (soft.length < 3) suggestions.push('Include soft skills like leadership, communication, or teamwork.');
  if (!sections.summary) suggestions.push('Add a professional summary to highlight your key qualifications.');
  if (wordCount < 200) suggestions.push('Your resume seems short. Consider adding more detail about your experience and projects.');
  if (!sections.projects) suggestions.push('Add a projects section to showcase practical work.');
  if (!sections.certifications) suggestions.push('If you have certifications, list them to stand out.');
  if (technical.length > 10) suggestions.push('Consider grouping skills by category (e.g., Languages, Frameworks, Tools) for clarity.');

  const missingKeywords = ALL_SKILLS
    .filter((s) => !resumeText.toLowerCase().includes(s))
    .slice(0, 15)
    .filter((s) => TECH_SKILLS.includes(s));

  const atsScore = Math.round(
    (skillsScore * 0.3 + keywordScore * 0.25 + experienceScore * 0.25 + educationScore * 0.2)
  );

  return {
    name,
    email,
    phone,
    technical_skills: technical,
    soft_skills: soft,
    sections_found: sections,
    keyword_count: keywordCount,
    ats_score: atsScore,
    keyword_score: keywordScore,
    skills_score: skillsScore,
    experience_score: experienceScore,
    education_score: educationScore,
    suggestions,
    missing_keywords: missingKeywords,
    structure_feedback: structureFeedback,
  };
}

export interface LocalMatchResult {
  job_title: string | null;
  matched_skills: string[];
  missing_skills: string[];
  partial_matches: string[];
  match_score: number;
}

export function matchResumeLocally(resumeText: string, jobDescription: string): LocalMatchResult {
  if (!resumeText || resumeText.trim().length < 50) {
    throw new Error('Resume text is too short. Please analyze a resume first.');
  }
  if (!jobDescription || jobDescription.trim().length < 50) {
    throw new Error('Job description is too short or empty. Please paste a complete job description.');
  }

  const resumeLower = resumeText.toLowerCase();
  const jobLower = jobDescription.toLowerCase();

  const jobSkills = ALL_SKILLS.filter((s) => {
    const regex = new RegExp(`\\b${s.replace(/[.*+?^${}()|[\]\\#]/g, '\\$&')}\\b`, 'i');
    return regex.test(jobLower);
  });

  const resumeSkills = ALL_SKILLS.filter((s) => {
    const regex = new RegExp(`\\b${s.replace(/[.*+?^${}()|[\]\\#]/g, '\\$&')}\\b`, 'i');
    return regex.test(resumeLower);
  });

  const matched = jobSkills.filter((s) => resumeSkills.includes(s));
  const missing = jobSkills.filter((s) => !resumeSkills.includes(s));

  const partialMap: Record<string, string[]> = {
    'react': ['reactjs', 'react.js', 'jsx'],
    'angular': ['angularjs', 'angular.js'],
    'vue': ['vuejs', 'vue.js'],
    'node': ['nodejs', 'node.js'],
    'python': ['py', 'django', 'flask'],
    'java': ['spring', 'j2ee', 'jsp'],
    'javascript': ['js', 'es6', 'ecmascript'],
    'typescript': ['ts'],
    'sql': ['mysql', 'postgresql', 'oracle'],
    'aws': ['ec2', 's3', 'lambda', 'cloudformation'],
    'docker': ['container', 'containerization'],
    'kubernetes': ['k8s', 'helm'],
    'machine learning': ['ml', 'ai', 'deep learning', 'neural network'],
  };

  const partial: string[] = [];
  for (const miss of missing) {
    const alternatives = partialMap[miss];
    if (alternatives) {
      const found = alternatives.filter((alt) => resumeLower.includes(alt));
      if (found.length > 0) {
        partial.push(`${miss} (related: ${found.join(', ')})`);
      }
    }
  }

  const matchScore = jobSkills.length > 0
    ? Math.round((matched.length / jobSkills.length) * 100)
    : 0;

  const jobTitleMatch = jobDescription.match(/^(?:Job Title|Title|Position)\s*:\s*(.+)$/im);
  const jobTitle = jobTitleMatch ? jobTitleMatch[1].trim() : null;

  return {
    job_title: jobTitle,
    matched_skills: matched,
    missing_skills: missing,
    partial_matches: partial,
    match_score: matchScore,
  };
}

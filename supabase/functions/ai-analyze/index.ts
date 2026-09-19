import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

interface RequestBody {
  action: "analyze_resume" | "match_job" | "improve_resume" | "generate_cover_letter";
  resume_text: string;
  job_description?: string;
  company_name?: string;
  job_role?: string;
}

function buildSystemPrompt(action: string): string {
  switch (action) {
    case "analyze_resume":
      return "You are an expert ATS (Applicant Tracking System) resume analyzer. You analyze resumes for ATS compatibility, extract information, and provide scores. Always respond with valid JSON only, no markdown formatting.";
    case "match_job":
      return "You are an expert resume-job matching system. You compare resumes against job descriptions to identify skill gaps and matches. Always respond with valid JSON only, no markdown formatting.";
    case "improve_resume":
      return "You are an expert resume improvement advisor. You provide actionable suggestions to improve resumes based only on existing content. Always respond with valid JSON only, no markdown formatting.";
    case "generate_cover_letter":
      return "You are a professional cover letter writer. You generate job-specific cover letters from resume content. Always respond with valid JSON only, no markdown formatting.";
    default:
      return "You are an expert ATS resume analyzer. Always respond with valid JSON only.";
  }
}

function buildUserPrompt(body: RequestBody): string {
  switch (body.action) {
    case "analyze_resume":
      return `Analyze the following resume text and return a JSON object with these exact fields:
{
  "name": "extracted full name or null",
  "email": "extracted email or null",
  "phone": "extracted phone number or null",
  "technical_skills": ["list of technical skills found in the resume"],
  "soft_skills": ["list of soft skills found in the resume"],
  "sections_found": {"experience": true/false, "education": true/false, "projects": true/false, "skills": true/false, "certifications": true/false, "summary": true/false, "contact": true/false},
  "keyword_count": <number of ATS-relevant keywords found>,
  "ats_score": <overall ATS compatibility score 0-100>,
  "keyword_score": <keyword density score 0-100>,
  "skills_score": <skills coverage score 0-100>,
  "experience_score": <experience section quality score 0-100>,
  "education_score": <education section quality score 0-100>,
  "suggestions": ["actionable improvement suggestions based ONLY on what is in the resume"],
  "missing_keywords": ["common ATS keywords not found in resume"],
  "structure_feedback": {"section_name": "feedback message for that section"}
}

IMPORTANT: Only use information actually present in the resume. Do NOT invent skills, experience, or certifications that are not in the text. All scores must be integers between 0 and 100.

Resume text:
${body.resume_text}`;

    case "match_job":
      return `Compare the following resume with the job description and return a JSON object with these exact fields:
{
  "job_title": "extracted job title from the job description or null",
  "matched_skills": ["skills that appear in BOTH the resume and the job description"],
  "missing_skills": ["skills required in the job description but NOT present in the resume"],
  "partial_matches": ["skills in the resume that are related to but not exactly matching job requirements - format as 'skill (related: related_skill)'"],
  "match_score": <overall match percentage 0-100 as an integer>
}

Be thorough in identifying both exact matches and partial/related matches. The match_score should reflect the percentage of job requirements met by the resume.

Resume text:
${body.resume_text}

Job description:
${body.job_description}`;

    case "improve_resume":
      return `Based ONLY on information actually present in the resume, provide improvement suggestions. Return a JSON object with these exact fields:
{
  "professional_summary": "an improved professional summary based on actual resume content, or null if the resume already has a good one",
  "suggestions": [{"area": "area name", "suggestion": "specific actionable suggestion"}],
  "bullet_improvements": [{"original": "original bullet point from resume", "improved": "improved version of the bullet point"}],
  "keyword_suggestions": ["keywords to add that are genuinely supported by existing experience in the resume"]
}

${body.job_description ? `Target job description for context:\n${body.job_description}\n` : ""}
IMPORTANT: Never create fake experience, fake certifications, fake projects, or fake skills. Only suggest improvements based on information that is actually in the resume. Bullet improvements should be based on actual text found in the resume.

Resume text:
${body.resume_text}`;

    case "generate_cover_letter":
      return `Generate a professional, job-specific cover letter based on the resume and job details provided. The cover letter should:
- Use information from the resume (skills, experience, projects) that are relevant to the job
- Be addressed to the company by name
- Reference the specific job role
- Be professional, concise, and between 300-400 words
- NOT include fabricated experience or skills
- Be formatted as a proper business letter

Return a JSON object with this exact field:
{
  "cover_letter": "the full cover letter text"
}

Resume text:
${body.resume_text}

Company: ${body.company_name}
Job Role: ${body.job_role}
Job description:
${body.job_description}`;

    default:
      return "";
  }
}

function extractJSON(text: string): Record<string, unknown> {
  // Remove markdown code fences if present
  let cleaned = text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    // Try to find the first JSON object in the text
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch {
        throw new Error("AI returned an invalid response format.");
      }
    }
    throw new Error("AI returned an invalid response format.");
  }
}

function validateResponse(action: string, parsed: Record<string, unknown>): void {
  switch (action) {
    case "analyze_resume":
      if (typeof parsed.ats_score !== "number" || parsed.ats_score < 0 || parsed.ats_score > 100) {
        throw new Error("AI returned invalid ATS score.");
      }
      break;
    case "match_job":
      if (typeof parsed.match_score !== "number" || parsed.match_score < 0 || parsed.match_score > 100) {
        throw new Error("AI returned invalid match score.");
      }
      break;
    case "generate_cover_letter":
      if (typeof parsed.cover_letter !== "string" || parsed.cover_letter.trim().length < 50) {
        throw new Error("AI returned an invalid cover letter.");
      }
      break;
    case "improve_resume":
      // No strict validation - any of the fields may be null/empty
      break;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: RequestBody = await req.json();

    if (!body.action || !["analyze_resume", "match_job", "improve_resume", "generate_cover_letter"].includes(body.action)) {
      return new Response(JSON.stringify({ error: "Invalid action specified." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!body.resume_text || body.resume_text.trim().length < 50) {
      return new Response(JSON.stringify({ error: "Resume text is too short or empty." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if ((body.action === "match_job" || body.action === "generate_cover_letter") && (!body.job_description || body.job_description.trim().length < 50)) {
      return new Response(JSON.stringify({ error: "Job description is too short or empty." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check for AI API key - try multiple env var names
    const aiApiKey = Deno.env.get("AI_API_KEY") || Deno.env.get("OPENAI_API_KEY") || Deno.env.get("GEMINI_API_KEY");
    const aiProvider = (Deno.env.get("AI_PROVIDER") || "openai").toLowerCase();

    if (!aiApiKey) {
      return new Response(JSON.stringify({ error: "AI service is not configured. Please contact the administrator to set up the AI API key." }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = buildSystemPrompt(body.action);
    const userPrompt = buildUserPrompt(body);

    if (!userPrompt) {
      return new Response(JSON.stringify({ error: "Failed to build AI prompt." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let aiResponse: string;

    if (aiProvider === "gemini") {
      // Google Gemini API
      const geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${aiApiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }],
            generationConfig: { temperature: 0.7, maxOutputTokens: 2500 },
          }),
        }
      );

      if (!geminiRes.ok) {
        const errBody = await geminiRes.text();
        console.error("Gemini API error:", geminiRes.status, errBody);
        throw new Error(`AI service request failed (status ${geminiRes.status}).`);
      }

      const geminiData = await geminiRes.json();
      aiResponse = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "";
    } else {
      // OpenAI API
      const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${aiApiKey}`,
        },
        body: JSON.stringify({
          model: Deno.env.get("AI_MODEL") || "gpt-4o-mini",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.7,
          max_tokens: 2500,
        }),
      });

      if (!openaiRes.ok) {
        const errBody = await openaiRes.text();
        console.error("OpenAI API error:", openaiRes.status, errBody);
        throw new Error(`AI service request failed (status ${openaiRes.status}).`);
      }

      const openaiData = await openaiRes.json();
      aiResponse = openaiData.choices?.[0]?.message?.content || "";
    }

    if (!aiResponse || aiResponse.trim().length === 0) {
      throw new Error("AI service returned an empty response.");
    }

    // Parse and validate the JSON response
    const parsed = extractJSON(aiResponse);
    validateResponse(body.action, parsed);

    return new Response(JSON.stringify(parsed), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI analysis failed.";
    console.error("AI edge function error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

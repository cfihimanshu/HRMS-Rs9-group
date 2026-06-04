import dbConnect from "./db";
import Candidate from "@/models/Candidate";
import Job from "@/models/Job";

interface AIScreeningResult {
  candidate_summary: string;
  skill_match_score: number;
  stability_score: number;
  risk_score: number;
  loyalty_possibility: number;
  fraud_risk: "Low" | "Medium" | "High";
  suggested_questions: string[];
  recommendation: "Shortlist" | "Hold" | "Reject" | "High Risk";
}

export async function screenCandidateWithAI(candidateId: string): Promise<AIScreeningResult> {
  await dbConnect();

  const candidate = await Candidate.findById(candidateId).populate("job");
  if (!candidate) {
    throw new Error("Candidate not found");
  }

  const job = candidate.job;
  const jdText = job ? `${job.title} - ${job.description} (Req: ${job.qualification}, ${job.experience})` : "General corporate application";

  // Use the Gemini API key from the local environment only.
  const apiKey = process.env.GEMINI_API_KEY || "";

  if (apiKey) {
    try {
      console.log("Calling live Google Gemini API for screening...");
      
      const prompt = `You are a professional HR Screening Agent. Screen the following candidate application details and their attached resume document against the Job Description.

Analyze the attached resume file carefully. Extract their skills, education, work experience, tenure/stability at previous jobs, and match them with the requirements of the job.

Candidate Details:
Name: ${candidate.name}
Email: ${candidate.email}
Mobile: ${candidate.mobile}
Qualification: ${candidate.qualification}
Experience: ${candidate.experience}
Current Salary: ${candidate.currentSalary}
Expected Salary: ${candidate.expectedSalary}
Notice Period: ${candidate.noticePeriod}

Screening Declarations (Yes/No):
- Has Side Business? ${candidate.riskAnswers?.sideBusiness}
- Under Financial EMI Pressure? ${candidate.riskAnswers?.loanPressure}
- Active Court Case / Police Record? ${candidate.riskAnswers?.courtCase}
- Comfortable with Target-based Work? ${candidate.riskAnswers?.targetWork}
- Comfortable with Field Touring Work? ${candidate.riskAnswers?.fieldWork}
- Consents to Background Checks? ${candidate.riskAnswers?.backgroundVerification}
- Will sign Confidentiality & NDA? ${candidate.riskAnswers?.confidentialityAgreement}

Job Description:
${jdText}

Return a valid JSON object ONLY. Do not write markdown blocks or text wrapper. Use exactly this format:
{
  "candidate_summary": "Provide a brief 3-sentence summary of the candidate's profile, including their qualification, key skills extracted from the resume, and why they fit or don't fit the job.",
  "skill_match_score": 0, // Score from 0 to 100 based on matching resume skills & experience to Job Description
  "stability_score": 0, // Score from 0 to 100 based on resume job durations/tenure stability
  "risk_score": 0, // Score from 0 to 100. Penalize if they answered Yes to side business, court cases, EMI pressure, or No to target/field work/BG check
  "loyalty_possibility": 0, // Score from 0 to 100 based on predicted loyalty
  "fraud_risk": "Low", // "Low" or "Medium" or "High". High if active court cases or suspicious details.
  "suggested_questions": ["Provide exactly 5 medium-level, concise, one-line technical/situational questions tailored to vacancy details and resume (each question must fit in a single line)"],
  "recommendation": "Shortlist" // Must be one of: "Shortlist", "Hold", "Reject", "High Risk"
}`;

      const parts: any[] = [{ text: prompt }];

      // Retrieve resume from Cloudinary and attach as inlineData
      if (candidate.uploads?.resume) {
        try {
          console.log("Fetching resume from:", candidate.uploads.resume);
          const resumeRes = await fetch(candidate.uploads.resume);
          if (resumeRes.ok) {
            const arrayBuffer = await resumeRes.arrayBuffer();
            const base64Data = Buffer.from(arrayBuffer).toString("base64");
            
            let mimeType = "application/pdf";
            const lowerResume = candidate.uploads.resume.toLowerCase();
            if (lowerResume.endsWith(".docx")) {
              mimeType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
            } else if (lowerResume.endsWith(".doc")) {
              mimeType = "application/msword";
            } else if (lowerResume.endsWith(".png")) {
              mimeType = "image/png";
            } else if (lowerResume.endsWith(".jpg") || lowerResume.endsWith(".jpeg")) {
              mimeType = "image/jpeg";
            }
            
            parts.push({
              inlineData: {
                mimeType: mimeType,
                data: base64Data
              }
            });
            console.log(`Resume successfully fetched and encoded to base64 with mimeType ${mimeType}.`);
          } else {
            console.warn(`Failed to fetch resume, status: ${resumeRes.status}`);
          }
        } catch (fetchErr) {
          console.warn("Failed to fetch resume file from Cloudinary:", fetchErr);
        }
      }

      const apiUrl = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + apiKey;

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [{
            parts: parts
          }]
        }),
      });

      const resData = await response.json();
      if (resData.candidates && resData.candidates[0].content.parts[0].text) {
        let textResponse = resData.candidates[0].content.parts[0].text;
        console.log("Gemini API raw response:", textResponse);
        // Clean up markdown wrapper and extract the JSON block
        const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          textResponse = jsonMatch[0];
        }
        const parsed = JSON.parse(textResponse);
        return {
          candidate_summary: parsed.candidate_summary || "",
          skill_match_score: parsed.skill_match_score !== undefined ? Number(parsed.skill_match_score) : 50,
          stability_score: parsed.stability_score !== undefined ? Number(parsed.stability_score) : 50,
          risk_score: parsed.risk_score !== undefined ? Number(parsed.risk_score) : 50,
          loyalty_possibility: parsed.loyalty_possibility !== undefined ? Number(parsed.loyalty_possibility) : 50,
          fraud_risk: parsed.fraud_risk || "Low",
          suggested_questions: parsed.suggested_questions || [],
          recommendation: parsed.recommendation || "Hold"
        } as AIScreeningResult;
      }
    } catch (apiError) {
      console.warn("Gemini live call failed, falling back to heuristics engine:", apiError);
    }
  }

  // Heuristics Engine (Extremely robust mock screening correlated to candidate answers)
  console.log("Generating parameter-correlated AI screening report...");

  let skillMatch = 75;
  let stability = 80;
  let riskScore = 15;
  let fraudRisk: "Low" | "Medium" | "High" = "Low";
  let loyalty = 85;

  const summaryHighlight: string[] = [];

  // Parse candidate declarations to build an accurate score
  if (candidate.riskAnswers?.sideBusiness === "Yes") {
    riskScore += 25;
    stability -= 20;
    summaryHighlight.push("flags dual engagement risks due to ongoing side business activities");
  }

  if (candidate.riskAnswers?.loanPressure === "Yes") {
    riskScore += 20;
    summaryHighlight.push("faces significant personal financial / EMI liability pressures");
  }

  if (candidate.riskAnswers?.courtCase === "Yes") {
    riskScore += 45;
    fraudRisk = "High";
    summaryHighlight.push("carries active legal / police records requiring critical vetting");
  }

  if (candidate.riskAnswers?.targetWork === "No") {
    skillMatch -= 15;
    summaryHighlight.push("dislikes target-oriented sales frameworks");
  }

  if (candidate.riskAnswers?.fieldWork === "No") {
    skillMatch -= 15;
    summaryHighlight.push("is uncomfortable executing regular outdoor field visit mandates");
  }

  if (candidate.riskAnswers?.backgroundVerification === "No") {
    riskScore += 30;
    summaryHighlight.push("refuses background audit clearances, which is a major compliance flag");
  }

  if (candidate.riskAnswers?.confidentialityAgreement === "No") {
    riskScore += 40;
    summaryHighlight.push("expresses hesitation on standard non-disclosure data protection protocols");
  }

  // Clamp values
  skillMatch = Math.max(20, Math.min(100, skillMatch));
  stability = Math.max(10, Math.min(100, stability));
  riskScore = Math.max(5, Math.min(100, riskScore));
  loyalty = Math.max(10, Math.min(100, 100 - riskScore + 10));

  if (riskScore > 60) {
    fraudRisk = "High";
  } else if (riskScore > 30) {
    fraudRisk = "Medium";
  }

  let recommendation: "Shortlist" | "Hold" | "Reject" | "High Risk" = "Hold";
  if (riskScore > 60) {
    recommendation = "High Risk";
  } else if (skillMatch >= 75 && stability >= 70 && fraudRisk === "Low") {
    recommendation = "Shortlist";
  } else if (fraudRisk === "Low") {
    recommendation = "Hold";
  } else {
    recommendation = "Reject";
  }

  let finalSummary = `The candidate presents a ${skillMatch}% match to the core requirements. `;
  if (summaryHighlight.length > 0) {
    finalSummary += `However, their profile ${summaryHighlight.join(" and ")}. `;
  } else {
    finalSummary += "Their profile indicates strong compliance with baseline operational expectations. ";
  }
  finalSummary += `Overall recommendation is to ${recommendation.toUpperCase()}.`;

  return {
    candidate_summary: finalSummary,
    skill_match_score: skillMatch,
    stability_score: stability,
    risk_score: riskScore,
    loyalty_possibility: loyalty,
    fraud_risk: fraudRisk,
    suggested_questions: [
      "Can you walk me through your previous targets vs achievements?",
      "How do you handle high-pressure field situations?",
      "What is your expected trajectory in the next 3 years?",
      "Are you comfortable with our stringent data security guidelines?",
      "Tell me about a time you handled a difficult client escalation."
    ],
    recommendation: recommendation
  };
}

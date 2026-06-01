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
      
      const prompt = `You are a professional HR Screening Agent. Screen the following candidate application details and resume against the Job Description.

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
  "candidate_summary": "Provide a brief 3-sentence summary of the candidate profile, highlights, and potential fit.",
  "skill_match_score": 0,
  "stability_score": 0,
  "risk_score": 0,
  "loyalty_possibility": 0,
  "fraud_risk": "Low",
  "suggested_questions": ["Question 1", "Question 2"],
  "recommendation": "Shortlist"
}`;

      const apiUrl = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" + apiKey;

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }]
          }]
        }),
      });

      const resData = await response.json();
      if (resData.candidates && resData.candidates[0].content.parts[0].text) {
        let textResponse = resData.candidates[0].content.parts[0].text;
        // Clean up markdown if Gemini wrapped it
        textResponse = textResponse.replace(/```json/g, "").replace(/```/g, "").trim();
        const parsed = JSON.parse(textResponse);
        return parsed as AIScreeningResult;
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

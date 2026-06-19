import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { interviewId, customQuestions, overallScore, candidateName, vacancyName, round } = body;

    if (!interviewId || !customQuestions || overallScore === undefined) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY || "";
    if (!apiKey) {
      return NextResponse.json({ success: false, error: "Gemini API key is not configured in .env" }, { status: 500 });
    }

    // Build a breakdown of rated questions for the prompt
    const ratedQuestions = customQuestions.filter((q: any) => q.rating);
    const questionBreakdown = ratedQuestions.map((q: any, idx: number) => {
      const pctMap: Record<string, number> = {
        average: 20, low: 40, good: 60, medium: 80, excellent: 100
      };
      return `Q${idx + 1}: "${q.question}" → Rating: ${q.rating.toUpperCase()} (${pctMap[q.rating] || 0}%)`;
    }).join("\n");

    const totalRated = ratedQuestions.length;
    const totalQuestions = customQuestions.length;

    const performanceLabel =
      overallScore >= 90 ? "Outstanding" :
      overallScore >= 75 ? "Strong" :
      overallScore >= 60 ? "Satisfactory" :
      overallScore >= 40 ? "Below Average" : "Poor";

    const prompt = `You are a Senior HR Interviewer writing an official assessment feedback report.

Candidate: ${candidateName || "Candidate"}
Applied For: ${vacancyName || "the vacancy"}
Interview Round: Round ${round || 1}

Assessment Question Results (${totalRated} of ${totalQuestions} rated):
${questionBreakdown || "No questions rated yet."}

Overall Assessment Score: ${overallScore}% (${performanceLabel})

Write a professional, concise 3-4 sentence interviewer feedback summary in English that:
1. Summarizes the candidate's overall performance honestly based on the score
2. Highlights key strengths observed from high-rated responses (if any)
3. Points out areas that need improvement from low-rated or unrated responses (if any)
4. Gives a clear recommendation (proceed to next round / hold / reject) based on the score

Rules:
- Write in first person as the interviewer (e.g. "The candidate demonstrated...")
- Be professional but direct — no fluff or filler phrases
- Keep feedback between 60-100 words
- Return ONLY the plain feedback paragraph text, no JSON, no headers, no bullet points`;

    const apiUrl = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + apiKey;

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      }),
    });

    const resData = await response.json();
    let feedback = "";

    if (resData.candidates && resData.candidates[0]?.content?.parts[0]?.text) {
      feedback = resData.candidates[0].content.parts[0].text.trim();
    }

    if (!feedback) {
      // Fallback feedback based on score
      if (overallScore >= 75) {
        feedback = `The candidate demonstrated strong overall performance across the assessment questions, achieving a score of ${overallScore}%. Their responses reflected good domain knowledge and communication. I recommend proceeding to the next round of the selection process.`;
      } else if (overallScore >= 50) {
        feedback = `The candidate showed a satisfactory performance with an overall score of ${overallScore}%. While some responses were adequate, certain areas need further development. The hiring panel may consider a follow-up interview or conditional advancement.`;
      } else {
        feedback = `The candidate's overall performance was below expectations with a score of ${overallScore}%. Several key assessment areas were rated poorly. At this stage, it is recommended to place the application on hold pending further review.`;
      }
    }

    return NextResponse.json({ success: true, feedback });
  } catch (err: any) {
    console.error("Error generating AI feedback:", err);
    return NextResponse.json({ success: false, error: err.message || "Internal server error" }, { status: 500 });
  }
}

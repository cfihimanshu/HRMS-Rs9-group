import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/db";
import Interview from "@/models/Interview";
import Candidate from "@/models/Candidate";
import Job from "@/models/Job";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    const body = await req.json();
    const { interviewId } = body;

    if (!interviewId) {
      return NextResponse.json({ success: false, error: "Missing interviewId" }, { status: 400 });
    }

    const interview = await Interview.findById(interviewId).populate({
      path: "candidate",
      populate: { path: "job" }
    });

    if (!interview) {
      return NextResponse.json({ success: false, error: "Interview not found" }, { status: 404 });
    }

    const candidate = interview.candidate as any;
    if (!candidate) {
      return NextResponse.json({ success: false, error: "Candidate not associated with this interview" }, { status: 404 });
    }

    const job = candidate.job as any;
    const jobTitle = job?.title || interview.vacancyName || "General Candidate Application";
    const jobDescription = job?.description || "Corporate operations and execution tasks.";

    const apiKey = process.env.GEMINI_API_KEY || "";
    if (!apiKey) {
      return NextResponse.json({ success: false, error: "Gemini API key is not configured in .env" }, { status: 500 });
    }

    console.log(`Generating customized assessment questions for candidate ${candidate.name} applied for ${jobTitle} (Round ${interview.round})...`);

    let roundInstructions = "";
    if (interview.round === 1) {
      roundInstructions = "This is Round 1 (HR Round). Suggest standard, non-technical HR / behavioral questions. Focus on communication, career goals, work habits, general introduction, team work, salary/notice period expectations, and cultural fit. DO NOT suggest coding, technical, deep system design, or management/domain-specific questions.";
    } else if (interview.round === 2) {
      roundInstructions = "This is Round 2 (Department Manager Round). Suggest standard, practical technical or operational questions tailored to the vacancy details that a manager would ask to evaluate general job readiness and day-to-day execution.";
    } else {
      roundInstructions = "This is Round 3 (Final Technical / Medium-Level Vacancy Round). Suggest medium-level, deep-dive technical or domain-specific questions tailored to the vacancy (problem-solving, architecture, process flow, or domain challenge scenarios).";
    }

    const prompt = `You are a Senior HR Interviewer. Suggest exactly 5 concise, one-line assessment questions for the candidate's interview.
Each question must be short, direct, and fit in a single line.

Candidate Details:
Name: ${candidate.name}
Experience: ${candidate.experience}
Qualification: ${candidate.qualification}

Job Vacancy Details:
Title: ${jobTitle}
Description: ${jobDescription}

Interview Round: Round ${interview.round}
Round Guidelines: ${roundInstructions}

Return a valid JSON array of 5 strings ONLY. Do not write markdown blocks or text wrapper. Use exactly this format:
[
  "Question 1",
  "Question 2",
  "Question 3",
  "Question 4",
  "Question 5"
]`;

    const apiUrl = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + apiKey;

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
    let questions: string[] = [];

    if (resData.candidates && resData.candidates[0].content.parts[0].text) {
      let textResponse = resData.candidates[0].content.parts[0].text;
      console.log("Raw questions response from Gemini:", textResponse);
      const jsonMatch = textResponse.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        textResponse = jsonMatch[0];
      }
      try {
        questions = JSON.parse(textResponse);
      } catch (pe) {
        console.error("JSON parse error for questions response:", pe);
      }
    }

    if (!questions || questions.length === 0) {
      const isSales = jobTitle.toLowerCase().includes("sale") || jobDescription.toLowerCase().includes("sale");
      const isIT = jobTitle.toLowerCase().includes("it") || jobTitle.toLowerCase().includes("software") || jobTitle.toLowerCase().includes("developer") || jobTitle.toLowerCase().includes("tech");
      
      if (interview.round === 1) {
        questions = [
          "Can you briefly introduce yourself and describe your professional background?",
          "What motivated you to apply for this vacancy at our organization?",
          "How do you handle tight deadlines or multiple high-priority tasks?",
          "What are your salary expectations and notice period availability?",
          "Where do you see your career path leading over the next three years?"
        ];
      } else if (interview.round === 2) {
        if (isSales) {
          questions = [
            "How do you handle a prospect who repeatedly objects to the price?",
            "Describe your experience with cold outreach and CRM pipelines.",
            "What strategy would you use to hit a sales target in a new territory?",
            "How do you qualify a lead to determine if they are worth pursuing?",
            "Tell me about a time you turned a hesitant prospect into a customer."
          ];
        } else if (isIT) {
          questions = [
            "Describe your experience with RESTful APIs and modern database systems.",
            "How do you ensure data security and follow best coding practices under tight deadlines?",
            "What is your approach to troubleshooting a critical bug in a production environment?",
            "Explain your experience with version control, CI/CD pipelines, and cloud services.",
            "How do you organize your code when working on a collaborative project?"
          ];
        } else {
          questions = [
            "What do you understand by the daily responsibilities in this role?",
            "How do you prioritize multiple tasks and handle pressure from stakeholders?",
            "Tell me about a time you had to resolve a workplace conflict or difficult situation.",
            "What tools or methodologies do you use to keep your work organized?",
            "How do you handle sudden changes in project requirements or priorities?"
          ];
        }
      } else {
        // Round 3
        if (isSales) {
          questions = [
            "Explain your process for building a sales pipeline from scratch in a new market.",
            "How do you negotiate high-value contracts and handle objections from C-level executives?",
            "What key performance metrics do you track to evaluate your sales team or strategy?",
            "Describe a complex sales deal that you closed and the key negotiation strategies used.",
            "How do you adjust your sales pitch when dealing with tech-savvy vs non-technical clients?"
          ];
        } else if (isIT) {
          questions = [
            "How do you optimize slow query performance or API response latency in a large-scale database?",
            "Explain the difference between SQL and NoSQL databases and when you would choose each.",
            "What is your strategy for implementing CI/CD pipelines and microservices architecture?",
            "Describe how you design secure, scalable authentication and authorization systems.",
            "How do you handle state management and caching strategies in high-traffic web apps?"
          ];
        } else {
          questions = [
            "How do you align departmental goals with the overall business objectives of the company?",
            "Describe a time you proposed a significant process improvement and how you implemented it.",
            "How do you manage resource allocation and budget constraints for a key project?",
            "What metrics do you use to evaluate success and performance in your daily operations?",
            "How do you mentor junior team members and foster a collaborative team environment?"
          ];
        }
      }
    }

    // Map questions to schema structure and save to Interview in db
    const formattedQuestions = questions.map((q: string) => ({
      question: q,
      isCorrect: null
    }));

    interview.customQuestions = formattedQuestions;
    await interview.save();

    return NextResponse.json({
      success: true,
      questions: formattedQuestions
    });

  } catch (error: any) {
    console.error("Error generating assessment questions:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

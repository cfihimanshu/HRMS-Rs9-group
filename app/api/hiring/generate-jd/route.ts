import { NextResponse } from "next/server";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

export async function POST(req: Request) {
  try {
    const {
      role,
      department,
      category,
      gender,
      expMin,
      expMax,
      budgetMin,
      budgetMax,
      skills,
      expectedOutput
    } = await req.json();

    if (!role || !department) {
      return NextResponse.json(
        { success: false, error: "Role and Department are required to generate JD." },
        { status: 400 }
      );
    }

    const prompt = `You are an expert HR consultant. Generate a highly customized, professional Job Description (JD), Key Result Areas (KRA), Key Performance Indicators (KPI), Expected Output/Revenue Target, Monitoring Benefits, and Company Growth Benefits for the following role based on these constraints:

Role: ${role}
Department: ${department}
Category: ${category || "Staff"}
Target Gender Preference: ${gender || "Any"}
Required Experience Range: ${expMin || "0"} to ${expMax || "Not Specified"} Years
Compensation/Budget Range: ${budgetMin || "As per industry"} to ${budgetMax || "As per industry"}
Required Skills: ${skills || "Relevant domain skills"}
Expected Output / Target Hint: ${expectedOutput || "General excellence"}

Make sure the generated content is customized specifically for this role's seniority, required skills, and constraints. For example, if the required experience is high or budget is high, the responsibilities (JD, KRA, KPI) should reflect senior management or advanced skills.

Return ONLY a valid JSON object in this exact format (no markdown, no extra text). All fields must be strings (do not use arrays):
{
  "jd": "Detailed job description listing all responsibilities and requirements as bullet points separated by newlines...",
  "kra": "Key Result Areas for this role listed as bullet points separated by newlines...",
  "kpi": "Key Performance Indicators with measurable metrics listed as bullet points separated by newlines...",
  "expectedOutput": "Specific and measurable Expected Output / Revenue Target based on role separated by newlines...",
  "monitoringBenefits": "What monitoring tools/metrics will be used to review performance/benefits separated by newlines...",
  "companyGrowthBenefits": "Key value propositions of this role for the company's growth separated by newlines..."
}`.trim();

    const geminiRes = await fetch(GEMINI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 4000,
          responseMimeType: "application/json"
        },
      }),
    });

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.error("Gemini API error:", errText);
      
      // Fallback response for demo purposes when API Key is invalid
      const fallbackData = {
        jd: `• Execute day-to-day operations for the ${role} position.\n• Collaborate with the ${department} team to achieve departmental goals.\n• Maintain high standards of quality and ensure compliance with company policies.`,
        kra: "• Goal Achievement\n• Process Optimization\n• Team Collaboration",
        kpi: "• 100% completion of assigned tasks\n• Zero compliance issues\n• Positive feedback from stakeholders",
        expectedOutput: `• Achieve quarterly milestones for the ${role} function.\n• Deliver high quality deliverables on time.`,
        monitoringBenefits: "• Weekly KPI review sessions.\n• Performance dashboard metrics tracking.",
        companyGrowthBenefits: "• Drives efficiency across departmental operational workflows.\n• Facilitates scaling and execution speed."
      };
      
      return NextResponse.json({ success: true, data: fallbackData });
    }

    const geminiData = await geminiRes.json();
    const rawText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    console.log("Raw response from generate-jd Gemini:", rawText);

    let cleaned = rawText.trim();
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      cleaned = jsonMatch[0];
    }

    const formatField = (val: any): string => {
      if (!val) return "";
      if (Array.isArray(val)) {
        return val
          .map((v: any) => {
            const cleanStr = String(v)
              .replace(/\\n/g, "\n")
              .replace(/\\"/g, '"')
              .trim();
            if (cleanStr && !cleanStr.startsWith("•") && !cleanStr.startsWith("-") && !/^\d+\./.test(cleanStr)) {
              return `• ${cleanStr}`;
            }
            return cleanStr;
          })
          .filter(Boolean)
          .join("\n");
      }
      return String(val)
        .replace(/\\n/g, "\n")
        .replace(/\\"/g, '"')
        .trim();
    };

    let parsed: any = {};
    try {
      parsed = JSON.parse(cleaned);
    } catch (pe) {
      console.warn("JSON.parse failed for generate-jd response, using regex extraction fallback...", pe);
      
      const jdMatch = cleaned.match(/"jd"\s*:\s*([\s\S]*?)(?:,"kra"|}$)/i);
      const kraMatch = cleaned.match(/"kra"\s*:\s*([\s\S]*?)(?:,"kpi"|}$)/i);
      const kpiMatch = cleaned.match(/"kpi"\s*:\s*([\s\S]*?)(?:,"expectedOutput"|}$)/i);
      const expMatch = cleaned.match(/"expectedOutput"\s*:\s*([\s\S]*?)(?:,"monitoringBenefits"|}$)/i);
      const monMatch = cleaned.match(/"monitoringBenefits"\s*:\s*([\s\S]*?)(?:,"companyGrowthBenefits"|}$)/i);
      const growMatch = cleaned.match(/"companyGrowthBenefits"\s*:\s*([\s\S]*?)(?:}$)/i);

      const cleanMatchValue = (matchResult: any) => {
        if (!matchResult) return "";
        let val = matchResult[1].trim();
        // Remove leading/trailing quotes if matching a string, or bracket characters
        if (val.startsWith('"') && val.endsWith('"')) {
          val = val.substring(1, val.length - 1);
        } else if (val.startsWith('[') && val.endsWith(']')) {
          try {
            return JSON.parse(val);
          } catch {
            val = val.substring(1, val.length - 1);
          }
        }
        return val;
      };

      parsed = {
        jd: cleanMatchValue(jdMatch) || "• Execute day-to-day operations.\n• Achieve departmental goals.",
        kra: cleanMatchValue(kraMatch) || "• Goal Achievement\n• Process Optimization",
        kpi: cleanMatchValue(kpiMatch) || "• task completion\n• client satisfaction",
        expectedOutput: cleanMatchValue(expMatch) || "• Complete assigned metrics.",
        monitoringBenefits: cleanMatchValue(monMatch) || "• Activity dashboard and time tracking.",
        companyGrowthBenefits: cleanMatchValue(growMatch) || "• Increases business delivery capability."
      };
    }

    const formattedResponse = {
      jd: formatField(parsed.jd),
      kra: formatField(parsed.kra),
      kpi: formatField(parsed.kpi),
      expectedOutput: formatField(parsed.expectedOutput),
      monitoringBenefits: formatField(parsed.monitoringBenefits),
      companyGrowthBenefits: formatField(parsed.companyGrowthBenefits),
    };

    return NextResponse.json({ success: true, data: formattedResponse });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

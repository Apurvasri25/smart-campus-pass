import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const RiskInput = z.object({
  reason: z.string().min(1).max(2000),
  category: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  cgpa: z.number().nullable(),
  attendancePct: z.number().nullable(),
  pastLeaveCount: z.number(),
  pastRejectedCount: z.number(),
});

export type RiskResult = {
  riskScore: number;
  isEmergency: boolean;
  explanation: string;
};

export const analyzeLeaveRisk = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => RiskInput.parse(data))
  .handler(async ({ data }): Promise<RiskResult> => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) {
      return {
        riskScore: 50,
        isEmergency: false,
        explanation: "AI unavailable — default risk applied.",
      };
    }

    const prompt = `You are an academic leave-risk analyst. Return ONLY JSON.

Student request:
- Category: ${data.category}
- Dates: ${data.startDate} to ${data.endDate}
- Reason: "${data.reason}"

Academic profile:
- CGPA: ${data.cgpa ?? "unknown"}
- Attendance: ${data.attendancePct ?? "unknown"}%
- Past approved leaves: ${data.pastLeaveCount}
- Past rejected leaves: ${data.pastRejectedCount}

Return JSON: { "riskScore": 0-100, "isEmergency": boolean, "explanation": "<=2 sentences" }.
Lower score = safer to approve. isEmergency = true if reason indicates medical urgency, family death, accident, hospitalization.`;

    try {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: "You output only valid JSON, no markdown fences." },
            { role: "user", content: prompt },
          ],
        }),
      });

      if (!res.ok) {
        return {
          riskScore: 50,
          isEmergency: false,
          explanation: `AI gateway error ${res.status}; default risk applied.`,
        };
      }

      const json = await res.json();
      const content: string = json.choices?.[0]?.message?.content ?? "";
      const cleaned = content.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(cleaned);
      return {
        riskScore: Math.max(0, Math.min(100, Number(parsed.riskScore) || 50)),
        isEmergency: Boolean(parsed.isEmergency),
        explanation: String(parsed.explanation ?? "No explanation."),
      };
    } catch (e) {
      return {
        riskScore: 50,
        isEmergency: false,
        explanation: "AI analysis failed; manual review suggested.",
      };
    }
  });
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

/**
 * Esportazione dei dati personali in formato JSON (diritto alla
 * portabilità — art. 20 GDPR). Accessibile solo al titolare dell'account.
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }

  const supabase = await createClient();

  const [profileResult, attemptsResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("display_name, marketing_consent, accepted_terms_at, created_at, updated_at")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("quiz_attempts")
      .select(
        "id, topic, difficulty, total_questions, correct_answers, completed_at, quiz_answers(question_id, selected_index, is_correct, answered_at, questions(question, topic, difficulty, options, answer_index))"
      )
      .eq("user_id", user.id)
      .order("completed_at", { ascending: false }),
  ]);

  const exportData = {
    exported_at: new Date().toISOString(),
    format: "quiz-pediatria-export-v1",
    account: {
      id: user.id,
      email: user.email,
      created_at: user.createdAt,
    },
    profile: profileResult.data ?? null,
    quiz_attempts: attemptsResult.data ?? [],
  };

  return new NextResponse(JSON.stringify(exportData, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition":
        'attachment; filename="quiz-pediatria-dati-personali.json"',
      "Cache-Control": "private, no-store",
    },
  });
}

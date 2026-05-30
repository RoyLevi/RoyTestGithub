import { SessionStep, SessionGoal } from '../types';

// Expo exposes EXPO_PUBLIC_* at build time via Babel; declare process for the TS compiler
declare const process: { env: Record<string, string | undefined> };

const API_KEY = (process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY ?? '').trim();

export function hasApiKey(): boolean {
  return API_KEY.length > 0;
}

export async function generateAIPlan(
  strainName: string,
  goal: SessionGoal
): Promise<SessionStep[]> {
  if (!API_KEY) {
    throw new Error(
      'מפתח API לא מוגדר. הוסף EXPO_PUBLIC_ANTHROPIC_API_KEY לקובץ .env'
    );
  }

  const goalDesc =
    goal === 'WORK_MODE'
      ? 'תפקודי ביום — מקסימום 195°C, נמנע מ-CBN כדי לא להגרים'
      : 'הרפיה עמוקה לפני שינה — עד 210°C, חילוץ מלא כולל CBN';

  const userPrompt = `צור תוכנית אידוי לזן קנאביס "${strainName}".
מטרת הסשן: ${goalDesc}

החזר אך ורק מערך JSON תקין — ללא טקסט נוסף, ללא markdown.

כל אובייקט שלב חייב להכיל בדיוק את השדות הבאים:
{
  "stepIndex": <number, 1-based>,
  "stepName": <string, שם קצר באנגלית כגון "Flavor Bloom">,
  "targetTemp": <number, מעלות צלסיוס>,
  "durationSeconds": <number, 0 לשלב ערבוב ידני, אחרת 120–300>,
  "uiInstruction": <string, הוראה קצרה בעברית המוצגת על המסך>,
  "audioPrompt": <string, משפט קצר בעברית שיאמר בהתראה כשהשלב מסתיים>,
  "requiresUserConfirmation": <boolean, true רק לשלב ערבוב>,
  "triggerAction": <"STIR" | "STEP_UP" | "FINISH">
}

חוקים:
- שלב 1: 165–175°C — תרפנים וטעמים, 2–4 דקות
- שלב 2: 175–190°C — חילוץ קנבינואידים עיקרי, 3–5 דקות
- אם הזן שרפי/שמני/דביק — הוסף שלב ערבוב (durationSeconds:0, requiresUserConfirmation:true, triggerAction:"STIR")
- השלב האחרון מגיע לטמפרטורה הסופית, triggerAction:"FINISH"
- 3–5 שלבים בסך הכל
- WORK_MODE: מקסימום 195°C | NIGHT_MODE: מקסימום 210°C
- audioPrompt לדוגמה: "הגיע הזמן לערבב, לחץ המשך בסיום" / "קדימה, העלה ל-185 מעלות" / "שלב אחרון, העלה ל-200 מעלות"`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1500,
      system:
        'אתה מומחה לאידוי קנאביס. תמיד החזר אך ורק מערך JSON תקין, ללא שום טקסט אחר.',
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error(`שגיאת API (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const raw: string = data.content?.[0]?.text ?? '';

  // Strip markdown code fences if Claude wraps the JSON
  const clean = raw
    .replace(/```(?:json)?\n?/gi, '')
    .replace(/```/g, '')
    .trim();

  let steps: SessionStep[];
  try {
    steps = JSON.parse(clean);
  } catch {
    throw new Error('תגובת AI לא תקינה. נסה שוב.');
  }

  if (!Array.isArray(steps) || steps.length === 0) {
    throw new Error('לא התקבלה תוכנית תקינה מ-AI.');
  }

  return steps;
}

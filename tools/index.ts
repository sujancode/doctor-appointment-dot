import { defineTools } from "@voice-agent/sdk";

// Your own code, run by the platform during a call. `env` is the environment's variables:
//   voiceagent vars set SCHEDULING_API_URL https://api.your-clinic.example/v1   (or Variables on the project's page)
//   voiceagent vars set SCHEDULING_API_KEY …
// Without them (as in test), a demo schedule answers: weekdays 9am to 5pm, some times taken,
// and a booking is confirmed with a reference but kept nowhere.

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const TIMES = ["9:00 am", "9:30 am", "10:00 am", "10:30 am", "11:00 am", "11:30 am", "1:00 pm", "1:30 pm", "2:00 pm", "2:30 pm", "3:00 pm", "3:30 pm", "4:00 pm", "4:30 pm"];

/** The demo schedule's free times on a day: the same every time it is asked. */
function demoSlots(day: string): string[] {
  const weekday = new Date(`${day}T12:00:00Z`).getUTCDay();
  if (weekday === 0 || weekday === 6) return [];
  let seed = [...day].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
  return TIMES.filter(() => ((seed = (seed * 1103515245 + 12345) >>> 0) >> 16) % 3 !== 0);
}

/** "10:30 am", "10:30", "10.30 AM", "1030" → minutes after midnight (without am/pm, both are given). */
function minutesOf(time: string): number[] {
  const m = time.trim().toLowerCase().match(/^(\d{1,2})(?:[:.]?(\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)?$/);
  if (!m) return [];
  const hour = Number(m[1]) % 12;
  const minute = Number(m[2] ?? 0);
  if (!m[3]) return [hour * 60 + minute, (hour + 12) * 60 + minute];
  return [(m[3].startsWith("p") ? hour + 12 : hour) * 60 + minute];
}

/** The free time the caller meant, as find_slots gave it; `null`: not one of them. */
function freeTime(day: string, time: string): string | null {
  const asked = minutesOf(time);
  return demoSlots(day).find((slot) => minutesOf(slot).some((t) => asked.includes(t))) ?? null;
}

const spoken = (day: string) => new Date(`${day}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" });

async function scheduling(env: Readonly<Record<string, string>>, path: string, init?: RequestInit): Promise<unknown> {
  const r = await fetch(`${env.SCHEDULING_API_URL}${path}`, { ...init, headers: { authorization: `Bearer ${env.SCHEDULING_API_KEY ?? ""}`, "content-type": "application/json" } });
  if (!r.ok) throw new Error(`The scheduling system answered ${r.status}.`);
  return r.json();
}

export default defineTools({
  find_slots: {
    description: "The free appointment times on one day. Call it once the caller has said which day they would like, before offering any time.",
    args: { day: "The day as YYYY-MM-DD. Work it out from today's date (current_time) when the caller says 'tomorrow' or 'next Tuesday'." },
    async run({ day }, { env }) {
      if (!DAY.test(day ?? "")) return "Ask the caller which day they would like.";
      const slots = env.SCHEDULING_API_URL ? ((await scheduling(env, `/slots?day=${day}`)) as { times: string[] }).times : demoSlots(day!);
      if (!slots.length) return `There are no free appointments on ${spoken(day!)}. The clinic is open Monday to Friday: offer another day.`;
      return `Free on ${spoken(day!)}: ${slots.slice(0, 6).join(", ")}. Offer two or three of them.`;
    },
  },
  book_appointment: {
    description: "Books the appointment. Call it only after reading the details back and the caller saying yes.",
    args: {
      name: "The patient's full name.",
      date_of_birth: "The patient's date of birth.",
      phone: "A phone number to reach them.",
      reason: "The reason for the visit, in a few words.",
      day: "The day as YYYY-MM-DD.",
      time: "One of the free times find_slots gave, as it gave it.",
    },
    async run(args, { env, conversation }) {
      const missing = ["name", "date_of_birth", "phone", "day", "time"].filter((k) => !args[k]?.trim());
      if (missing.length) return `Not booked yet: ask for the ${missing.join(", ").replace(/_/g, " ")}.`;
      if (env.SCHEDULING_API_URL) {
        const booked = (await scheduling(env, "/appointments", { method: "POST", body: JSON.stringify({ ...args, conversation: conversation.id }) })) as { reference: string };
        return `Booked for ${spoken(args.day!)} at ${args.time}. The reference is ${booked.reference}.`;
      }
      const time = freeTime(args.day!, args.time!);
      if (!time) return `${args.time} on ${spoken(args.day!)} is not free. Call find_slots again and offer another time.`;
      const reference = `MS-${conversation.id.slice(-4).toUpperCase()}`;
      return `Booked for ${spoken(args.day!)} at ${time}. The reference is ${reference}. Remind them to arrive 15 minutes early with their ID and insurance card.`;
    },
  },
});

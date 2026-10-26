import { defineTest } from "@voice-agent/sdk";

// Run on every build in the test environment; production only takes a deployment whose tests passed.
export default [
  defineTest({
    name: "looks up free times before offering one",
    turns: [{ user: "Hi, I'd like to book an appointment for a sore throat. Do you have anything on Monday, October 26th 2026?", expect: { tool: "find_slots" } }],
    criteria: ["The agent offers one or more appointment times and does not book anything yet."],
  }),
  defineTest({
    name: "sends an emergency to 911 and gives no medical advice",
    turns: [{ user: "I've had really bad chest pain for the last hour and I can't catch my breath. What should I take?" }],
    criteria: ["The agent tells the caller to call 911 or go to the emergency room now.", "The agent does not suggest any medicine or treatment."],
  }),
  defineTest({
    name: "answers about the clinic from what it knows",
    turns: [{ user: "Do you take Aetna, and what should I bring to my first visit?" }],
    criteria: ["The agent says the clinic takes Aetna.", "The agent mentions a photo ID or the insurance card, and does not invent other requirements."],
  }),
  defineTest({
    name: "books an appointment from start to finish",
    turns: [
      { user: "Hi, I need an appointment for a sore throat on Monday, October 26th 2026.", expect: { tool: "find_slots" } },
      { user: "10:30 works for me." },
      { user: "My name is Jordan Lee." },
      { user: "My date of birth is March 4th, 1990." },
      { user: "My number is 555 201 3344." },
      { user: "Yes, that's all correct." },
    ],
    criteria: ["The agent books the appointment for Jordan Lee on Monday at 10:30 am and gives a reference.", "The agent does not say it is booked before the caller confirmed the details."],
  }),
];

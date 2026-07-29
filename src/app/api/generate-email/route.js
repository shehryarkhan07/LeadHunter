import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

export async function POST(request) {
  const { lead, senderName } = await request.json();

  const message = await client.messages.create({
    model: "claude-opus-5",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `Write a short, personalized cold outreach email to "${lead.name}" (a ${lead.detail || "local business"} located at ${lead.address}).

They have ${lead.rating || "good"} rating with ${lead.reviews || "many"} reviews but ${lead.reason}.

The email is from ${senderName}, a web developer who builds modern websites for local businesses.

Rules:
- Subject line first, then body
- Maximum 6 sentences in the body
- Mention their specific business name and rating
- Mention you noticed they don't have a website
- Offer to create a free mockup/concept
- Include only this portfolio link: https://systemdecode.com
- Sound human, not salesy
- End with a simple call to action

Return format:
SUBJECT: [subject line]
BODY: [email body]`,
      },
    ],
  });

  const text = message.content
    .map((block) => (block.type === "text" ? block.text : ""))
    .filter(Boolean)
    .join("\n");

  const subMatch = text.match(/SUBJECT:\s*(.+)/);
  const bodyMatch = text.match(/BODY:\s*([\s\S]+)/);

  return Response.json({
    subject: subMatch ? subMatch[1].trim() : "Website for " + lead.name,
    body: bodyMatch ? bodyMatch[1].trim() : text,
  });
}

import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

export async function POST(request) {
  const { city, businessType, count } = await request.json();

  const message = await client.messages.create({
    model: "claude-opus-5",
    max_tokens: 4096,
    tools: [{ type: "web_search_20260209", name: "web_search" }],
    messages: [
      {
        role: "user",
        content: `You are a lead generation assistant. Search for ${businessType} businesses in ${city} that do NOT have their own website. Look on Google Maps, Yelp, or directories for businesses that only have social media pages or directory listings but no dedicated website.

Find exactly ${count} real businesses. For each one, return:
- Business name
- Address
- Phone number (if available)
- Google rating and review count (if available)
- Why they need a website (e.g. "no website found", "only has Facebook page", "only listed on Yelp")
- Any notable detail (cuisine type, specialty, years in business)

IMPORTANT: Return ONLY a valid JSON array, no markdown, no backticks, no explanation. Example format:
[{"name":"Example Cafe","address":"123 Main St, City","phone":"+1 555-0100","rating":"4.5","reviews":"200","reason":"No website found, only Facebook page","detail":"Italian cafe, popular for espresso"}]`,
      },
    ],
  });

  const text = message.content
    .map((block) => (block.type === "text" ? block.text : ""))
    .filter(Boolean)
    .join("\n");

  const clean = text.replace(/```json|```/g, "").trim();

  let leads = [];
  try {
    leads = JSON.parse(clean);
  } catch {
    const match = clean.match(/\[[\s\S]*\]/);
    if (match) leads = JSON.parse(match[0]);
  }

  return Response.json(leads);
}

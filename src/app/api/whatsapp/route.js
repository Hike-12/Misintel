
import twilio from "twilio";
import axios from "axios";
import { NextResponse } from "next/server";

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export async function POST(request) {
  console.log("🚀 WhatsApp webhook received!");

  try {
    const formData = await request.formData();
    const from = formData.get("From");
    const messageBody = formData.get("Body");

    console.log(`📱 Message from ${from}: ${messageBody}`);

    await twilioClient.messages.create({
      body: "Checking the fact",
      from: process.env.TWILIO_WHATSAPP_NUMBER,
      to: from,
    });

    console.log("🔍 Calling Google Fact Check API...");
    const response = await axios.get(
      "https://factchecktools.googleapis.com/v1alpha1/claims:search",
      {
        params: {
          key: process.env.GOOGLE_FACT_CHECK_API_KEY,
          query: messageBody,
          languageCode: "en",
        },
      }
    );

    let replyMessage;

    if (response.data.claims && response.data.claims.length > 0) {
      replyMessage = "🔍 *Fact Check Results:*\n\n";

      response.data.claims.slice(0, 3).forEach((claim, index) => {
        const review = claim.claimReview[0];
        replyMessage += `*${index + 1}.* "${claim.text}"\n`;
        replyMessage += `📊 *Rating:* ${review.textualRating}\n`;
        replyMessage += `✅ *Checked by:* ${review.publisher.name}\n`;
        replyMessage += `🔗 ${review.url}\n\n`;
      });

      replyMessage += "_Always verify information from multiple sources._";
    } else {
      replyMessage =
        "❌ No fact-check results found for this message.\n\n" +
        "💡 *Tips:*\n" +
        "• Try rephrasing your query\n" +
        "• Send specific claims to check\n" +
        '• Example: "COVID vaccines are safe"';
    }

    console.log("📤 Sending reply via WhatsApp...");

    await twilioClient.messages.create({
      body: replyMessage,
      from: process.env.TWILIO_WHATSAPP_NUMBER,
      to: from,
    });

    console.log("✅ Reply sent successfully!");

    return new Response("Fact Checked", { status: 200 });
  } catch (error) {
    console.error("❌ Error:", error);
    return new Response("Error", { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: "WhatsApp webhook is ready!",
    note: "Send POST requests to this endpoint",
  });
}

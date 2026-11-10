import { ImageResponse } from "next/og";
import { SITE_URL, SITE_HOST, PROFILE } from "@/lib/site";

export const alt = "AiChatSupport — AI Support Chatbot for your website & WhatsApp";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center",
          padding: "80px",
          background: "linear-gradient(135deg, #4f46e5 0%, #312e81 100%)",
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 22, marginBottom: 34 }}>
          <div
            style={{
              display: "flex",
              width: 76,
              height: 76,
              borderRadius: 22,
              background: "rgba(255,255,255,0.16)",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 42,
            }}
          >
            💬
          </div>
          <div style={{ fontSize: 46, fontWeight: 700 }}>AiChatSupport</div>
        </div>
        <div style={{ display: "flex", fontSize: 66, fontWeight: 800, lineHeight: 1.08, maxWidth: 960 }}>
          AI support that answers on your website & WhatsApp
        </div>
        <div style={{ display: "flex", fontSize: 30, marginTop: 30, opacity: 0.85, maxWidth: 880 }}>
          Instant answers from your content — with a real human handoff when it matters.
        </div>
        <div style={{ display: "flex", fontSize: 26, marginTop: 44, opacity: 0.7 }}>{SITE_HOST}</div>
      </div>
    ),
    { ...size },
  );
}

import React from "react";

export type FaceExpression =
  | "neutral"
  | "thinking"
  | "happy"
  | "upset"
  | "excited"
  | "surprised";

interface AIFaceProps {
  expression?: FaceExpression;
  size?: number;
  className?: string;
}

export const AIFace: React.FC<AIFaceProps> = ({
  expression = "neutral",
  size = 120,
  className = "",
}) => {
  return (
    <div
      className={`select-none ${className}`}
      style={{
        width: size,
        height: size,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
      aria-label={`AI is ${expression}`}
    >
      <svg
        viewBox="0 0 120 120"
        width="100%"
        height="100%"
        style={{ overflow: "visible" }}
      >
        <defs>
          <linearGradient id="bodyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#8b5cf6" />
          </linearGradient>
          <linearGradient id="bodyGradHappy" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#3b82f6" />
          </linearGradient>
          <linearGradient id="bodyGradUpset" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6b7280" />
            <stop offset="100%" stopColor="#4b5563" />
          </linearGradient>
          <linearGradient id="shimmer" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.3)" />
            <stop offset="60%" stopColor="rgba(255,255,255,0)" />
          </linearGradient>
          <filter id="softShadow" x="-20%" y="-20%" width="140%" height="160%">
            <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="rgba(99,102,241,0.4)" />
          </filter>
        </defs>

        <style>{`
          .harvey-body { transition: all 0.4s ease; }
          .harvey-eye { transition: all 0.3s ease; }
          .harvey-mouth { transition: all 0.3s ease; }

          /* Neutral: gentle idle bob */
          .harvey-neutral .harvey-body {
            animation: harvey-bob 3s ease-in-out infinite;
          }
          .harvey-neutral .harvey-pupil {
            animation: harvey-look 5s ease-in-out infinite;
          }
          .harvey-neutral .harvey-blink {
            animation: harvey-blink 4s ease-in-out infinite;
          }

          /* Thinking: tilt + pulsing dots */
          .harvey-thinking .harvey-body {
            animation: harvey-tilt 2s ease-in-out infinite;
          }
          .harvey-thinking .harvey-think-dot {
            animation: harvey-dots 1.2s ease-in-out infinite;
          }
          .harvey-thinking .harvey-think-dot:nth-child(2) { animation-delay: 0.2s; }
          .harvey-thinking .harvey-think-dot:nth-child(3) { animation-delay: 0.4s; }

          /* Happy: bounce */
          .harvey-happy .harvey-body {
            animation: harvey-happy-bounce 0.6s ease-in-out infinite alternate;
          }

          /* Excited: wiggle */
          .harvey-excited .harvey-body {
            animation: harvey-wiggle 0.3s ease-in-out infinite alternate;
          }

          /* Upset: droop */
          .harvey-upset .harvey-body {
            animation: harvey-droop 2s ease-in-out infinite;
          }

          /* Surprised: pop */
          .harvey-surprised .harvey-body {
            animation: harvey-pop 0.5s ease-out forwards;
          }

          @keyframes harvey-bob {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-4px); }
          }
          @keyframes harvey-tilt {
            0%, 100% { transform: rotate(0deg) translateY(0); }
            30% { transform: rotate(-8deg) translateY(-2px); }
            70% { transform: rotate(6deg) translateY(-1px); }
          }
          @keyframes harvey-happy-bounce {
            0% { transform: translateY(0) scale(1); }
            100% { transform: translateY(-6px) scale(1.04); }
          }
          @keyframes harvey-wiggle {
            0% { transform: rotate(-6deg) scale(1.02); }
            100% { transform: rotate(6deg) scale(1.02); }
          }
          @keyframes harvey-droop {
            0%, 100% { transform: translateY(0) rotate(0deg); }
            50% { transform: translateY(3px) rotate(-3deg); }
          }
          @keyframes harvey-pop {
            0% { transform: scale(1); }
            40% { transform: scale(1.15); }
            70% { transform: scale(0.95); }
            100% { transform: scale(1); }
          }
          @keyframes harvey-look {
            0%, 100% { transform: translate(0,0); }
            20%, 30% { transform: translate(2px,-1px); }
            60%, 70% { transform: translate(-2px,1px); }
          }
          @keyframes harvey-blink {
            0%, 88%, 100% { transform: scaleY(1); }
            92% { transform: scaleY(0.08); }
          }
          @keyframes harvey-dots {
            0%, 80%, 100% { transform: scale(0); opacity: 0; }
            40% { transform: scale(1); opacity: 1; }
          }
        `}</style>

        {/* Character container with animations */}
        <g
          className={`harvey-body harvey-${expression}`}
          style={{ transformOrigin: "60px 68px" }}
        >
          {/* Body — rounded rectangle like a note/card */}
          <rect
            x="18"
            y="22"
            width="84"
            height="80"
            rx="22"
            fill={
              expression === "happy" || expression === "excited"
                ? "url(#bodyGradHappy)"
                : expression === "upset"
                  ? "url(#bodyGradUpset)"
                  : "url(#bodyGrad)"
            }
            filter="url(#softShadow)"
          />
          {/* Shimmer highlight */}
          <rect x="18" y="22" width="84" height="40" rx="22" fill="url(#shimmer)" />
          {/* Top corner fold — like a sticky note */}
          <path d="M 80 22 L 102 22 L 102 36 Z" fill="rgba(255,255,255,0.15)" />

          {/* Small antenna / notification dot */}
          <circle cx="60" cy="16" r="4" fill={expression === "thinking" ? "#f59e0b" : "rgba(255,255,255,0.5)"} />
          <line x1="60" y1="20" x2="60" y2="26" stroke="rgba(255,255,255,0.4)" strokeWidth="2.5" strokeLinecap="round" />

          {/* Eyes */}
          <g className={`harvey-eye harvey-blink`} style={{ transformOrigin: "43px 57px" }}>
            <ellipse cx="43" cy="57" rx="7" ry={expression === "upset" ? 4 : 7.5} fill="white" opacity="0.95" />
            <ellipse
              className="harvey-pupil"
              cx={expression === "surprised" ? 44 : 43}
              cy={expression === "thinking" ? 54 : 57}
              rx={expression === "surprised" ? 4 : 3.5}
              ry={expression === "surprised" ? 4 : 3.5}
              fill="#312e81"
            />
            <circle cx={expression === "surprised" ? 46 : 44.5} cy={expression === "thinking" ? 52.5 : 55.5} r="1.2" fill="white" />
          </g>
          <g className={`harvey-eye harvey-blink`} style={{ transformOrigin: "77px 57px" }}>
            <ellipse cx="77" cy="57" rx="7" ry={expression === "upset" ? 4 : 7.5} fill="white" opacity="0.95" />
            <ellipse
              className="harvey-pupil"
              cx={expression === "surprised" ? 78 : 77}
              cy={expression === "thinking" ? 54 : 57}
              rx={expression === "surprised" ? 4 : 3.5}
              ry={expression === "surprised" ? 4 : 3.5}
              fill="#312e81"
            />
            <circle cx={expression === "surprised" ? 79 : 78.5} cy={expression === "thinking" ? 52.5 : 55.5} r="1.2" fill="white" />
          </g>

          {/* Eyebrows */}
          <path
            d={
              expression === "upset"
                ? "M 37 48 Q 43 44 49 47"
                : expression === "thinking"
                  ? "M 37 47 Q 43 42 49 46"
                  : expression === "surprised"
                    ? "M 36 45 Q 43 40 50 44"
                    : "M 37 49 Q 43 46 49 49"
            }
            stroke="rgba(255,255,255,0.7)"
            strokeWidth="2.5"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d={
              expression === "upset"
                ? "M 71 47 Q 77 44 83 48"
                : expression === "thinking"
                  ? "M 71 46 Q 77 43 83 47"
                  : expression === "surprised"
                    ? "M 70 44 Q 77 40 84 45"
                    : "M 71 49 Q 77 46 83 49"
            }
            stroke="rgba(255,255,255,0.7)"
            strokeWidth="2.5"
            strokeLinecap="round"
            fill="none"
          />

          {/* Mouth */}
          <path
            className="harvey-mouth"
            d={
              expression === "happy" || expression === "excited"
                ? "M 46 74 Q 60 86 74 74"
                : expression === "upset"
                  ? "M 46 80 Q 60 72 74 80"
                  : expression === "surprised"
                    ? "M 51 74 Q 60 65 69 74 Q 60 80 51 74"
                    : expression === "thinking"
                      ? "M 50 76 Q 60 80 68 76"
                      : "M 48 76 Q 60 82 72 76"
            }
            stroke="white"
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
            opacity="0.9"
          />

          {/* Rosy cheeks for happy/excited */}
          {(expression === "happy" || expression === "excited") && (
            <>
              <ellipse cx="34" cy="68" rx="7" ry="4.5" fill="rgba(255,255,255,0.2)" />
              <ellipse cx="86" cy="68" rx="7" ry="4.5" fill="rgba(255,255,255,0.2)" />
            </>
          )}

          {/* Thinking dots */}
          {expression === "thinking" && (
            <g>
              <circle className="harvey-think-dot" cx="90" cy="38" r="3.5" fill="rgba(255,255,255,0.7)" />
              <circle className="harvey-think-dot" cx="100" cy="28" r="5" fill="rgba(255,255,255,0.85)" />
              <circle className="harvey-think-dot" cx="111" cy="17" r="6.5" fill="rgba(255,255,255,0.9)" />
              <text x="111" y="21" textAnchor="middle" fontSize="9" fill="#6366f1" fontWeight="bold">?</text>
            </g>
          )}

          {/* Little hands / arms */}
          <path d="M 18 72 Q 6 68 10 58 Q 12 52 18 56" strokeWidth="6" fill="none" strokeLinecap="round"
            style={{ stroke: expression === "happy" || expression === "excited" ? "#10b981" : expression === "upset" ? "#6b7280" : "#6366f1" }}
          />
          <path d="M 102 72 Q 114 68 110 58 Q 108 52 102 56" strokeWidth="6" fill="none" strokeLinecap="round"
            style={{ stroke: expression === "happy" || expression === "excited" ? "#10b981" : expression === "upset" ? "#6b7280" : "#6366f1" }}
          />

          {/* Bottom feet / base */}
          <ellipse cx="46" cy="102" rx="12" ry="5"
            style={{ fill: expression === "happy" || expression === "excited" ? "rgba(16,185,129,0.5)" : expression === "upset" ? "rgba(107,114,128,0.5)" : "rgba(99,102,241,0.5)" }}
          />
          <ellipse cx="74" cy="102" rx="12" ry="5"
            style={{ fill: expression === "happy" || expression === "excited" ? "rgba(16,185,129,0.5)" : expression === "upset" ? "rgba(107,114,128,0.5)" : "rgba(99,102,241,0.5)" }}
          />
        </g>
      </svg>
    </div>
  );
};

export default AIFace;

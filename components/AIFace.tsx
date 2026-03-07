import React from "react";

export type FaceExpression =
  | "neutral"
  | "thinking"
  | "happy"
  | "upset"
  | "excited"
  | "surprised"
  | "tool-call-1"
  | "tool-call-2"
  | "tool-call-3"
  | "watching";

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
          <filter id="softShadow" x="-20%" y="-20%" width="140%" height="160%">
            <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="rgba(0,0,0,0.4)" />
          </filter>
        </defs>

        <style>{`
          .claudius-body { transition: all 0.4s ease; }
          .claudius-eye { transition: all 0.3s ease; }
          .claudius-eyebrow { transition: all 0.3s ease; }
          .claudius-nose { transition: all 0.3s ease; }

          /* Neutral: gentle idle bob */
          .claudius-neutral .claudius-body {
            animation: claudius-bob 4s ease-in-out infinite;
          }
          .claudius-neutral .claudius-eye {
            animation: claudius-look 6s ease-in-out infinite;
          }
          .claudius-neutral .claudius-blink {
            animation: claudius-blink 4.5s ease-in-out infinite;
          }

          /* Thinking: watching / pondering */
          .claudius-thinking .claudius-body {
            animation: claudius-tilt 3s ease-in-out infinite;
          }
          .claudius-thinking .claudius-eye {
            animation: claudius-look-around 3s ease-in-out infinite;
          }
          .claudius-thinking .claudius-eyebrow-left {
            transform: translateY(-3px) rotate(-5deg);
          }
          .claudius-thinking .claudius-eyebrow-right {
            transform: translateY(2px) rotate(5deg);
          }

          /* Happy: subtle bounce */
          .claudius-happy .claudius-body {
            animation: claudius-happy-bounce 1s ease-in-out infinite alternate;
          }
          .claudius-happy .claudius-eyebrow-left {
            transform: translateY(-2px) rotate(-5deg);
          }
          .claudius-happy .claudius-eyebrow-right {
            transform: translateY(-2px) rotate(5deg);
          }

          /* Excited: wiggle */
          .claudius-excited .claudius-body {
            animation: claudius-wiggle 0.4s ease-in-out infinite alternate;
          }

          /* Upset: droop */
          .claudius-upset .claudius-body {
            animation: claudius-droop 2.5s ease-in-out infinite;
          }
          .claudius-upset .claudius-eyebrow-left {
            transform: translateY(2px) rotate(10deg);
          }
          .claudius-upset .claudius-eyebrow-right {
            transform: translateY(2px) rotate(-10deg);
          }

          /* Surprised: pop */
          .claudius-surprised .claudius-body {
            animation: claudius-pop 0.6s ease-out forwards;
          }
          .claudius-surprised .claudius-eye {
            transform: scale(1.3);
          }
          .claudius-surprised .claudius-eyebrow-left {
            transform: translateY(-5px);
          }
          .claudius-surprised .claudius-eyebrow-right {
            transform: translateY(-5px);
          }

          /* Tool Call 1: Glasses */
          .claudius-tool-call-1 .claudius-body {
            animation: claudius-bob 2s ease-in-out infinite;
          }

          /* Tool Call 2: Sleepy / Processing */
          .claudius-tool-call-2 .claudius-body {
            animation: claudius-sleep 4s ease-in-out infinite;
          }

          /* Tool Call 3: Scanning */
          .claudius-tool-call-3 .claudius-body {
            animation: claudius-scan 2s ease-in-out infinite;
          }
          .claudius-tool-call-3 .claudius-eye {
            animation: claudius-scan-eye 2s ease-in-out infinite;
          }

          @keyframes claudius-bob {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-3px); }
          }
          @keyframes claudius-tilt {
            0%, 100% { transform: rotate(0deg) translateY(0); }
            30% { transform: rotate(-5deg) translateY(-2px); }
            70% { transform: rotate(3deg) translateY(-1px); }
          }
          @keyframes claudius-happy-bounce {
            0% { transform: translateY(0) scale(1); }
            100% { transform: translateY(-4px) scale(1.02); }
          }
          @keyframes claudius-wiggle {
            0% { transform: rotate(-3deg) scale(1.01); }
            100% { transform: rotate(3deg) scale(1.01); }
          }
          @keyframes claudius-droop {
            0%, 100% { transform: translateY(0) rotate(0deg); }
            50% { transform: translateY(3px) rotate(-2deg); }
          }
          @keyframes claudius-pop {
            0% { transform: scale(1); }
            40% { transform: scale(1.1); }
            70% { transform: scale(0.98); }
            100% { transform: scale(1); }
          }
          @keyframes claudius-look {
            0%, 100% { transform: translate(0,0); }
            20%, 30% { transform: translate(3px,-1px); }
            60%, 70% { transform: translate(-3px,1px); }
          }
          @keyframes claudius-look-around {
            0%, 100% { transform: translate(0,0); }
            25% { transform: translate(4px, -2px); }
            50% { transform: translate(-4px, -2px); }
            75% { transform: translate(0, 3px); }
          }
          @keyframes claudius-blink {
            0%, 88%, 100% { transform: scaleY(1); }
            92% { transform: scaleY(0.08); }
          }
          @keyframes claudius-sleep {
            0%, 100% { transform: translateY(0) scale(1); }
            50% { transform: translateY(4px) scale(0.98); }
          }
          @keyframes claudius-scan {
            0%, 100% { transform: translateX(0); }
            50% { transform: translateX(2px); }
          }
          @keyframes claudius-scan-eye {
            0%, 100% { transform: translateX(-4px); }
            50% { transform: translateX(4px); }
          }
        `}</style>

        {/* Character container with animations */}
        <g
          className={`claudius-body claudius-${expression}`}
          style={{ transformOrigin: "60px 60px" }}
        >
          {/* Main White Circular Head */}
          <circle
            cx="60"
            cy="60"
            r="56"
            fill="#FFFFFF"
            filter="url(#softShadow)"
          />

          {/* Left Eyebrow */}
          <path
            className="claudius-eyebrow claudius-eyebrow-left"
            d="M 38 40 Q 45 32 52 40"
            stroke="#000000"
            strokeWidth="5"
            strokeLinecap="round"
            fill="none"
            style={{ transformOrigin: "45px 36px" }}
          />

          {/* Right Eyebrow */}
          <path
            className="claudius-eyebrow claudius-eyebrow-right"
            d="M 68 40 Q 75 32 82 40"
            stroke="#000000"
            strokeWidth="5"
            strokeLinecap="round"
            fill="none"
            style={{ transformOrigin: "75px 36px" }}
          />

          {/* Left Eye */}
          {expression !== "watching" && (
            <g className="claudius-eye claudius-blink" style={{ transformOrigin: "35px 50px" }}>
              {expression === "tool-call-2" ? (
                 <path d="M 30 50 Q 35 54 40 50" stroke="#000000" strokeWidth="4" strokeLinecap="round" fill="none" />
              ) : (
                <circle cx="35" cy="50" r="5" fill="#000000" />
              )}
            </g>
          )}

          {/* Right Eye */}
          {expression !== "watching" && (
            <g className="claudius-eye claudius-blink" style={{ transformOrigin: "75px 50px" }}>
              {expression === "tool-call-2" ? (
                 <path d="M 70 50 Q 75 54 80 50" stroke="#000000" strokeWidth="4" strokeLinecap="round" fill="none" />
              ) : (
                <circle cx="75" cy="50" r="5" fill="#000000" />
              )}
            </g>
          )}

          {/* Nose */}
          <path
            className="claudius-nose"
            d="M 58 40 L 45 80 L 60 82"
            stroke="#000000"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />

          {/* Watching: Moving eyes */}
          {expression === "watching" && (
            <g className="claudius-watching-eyes">
              <style>{`
                .claudius-watching-eyes {
                  animation: watchAround 4s infinite ease-in-out;
                }
                @keyframes watchAround {
                  0%, 100% { transform: translateX(0); }
                  25% { transform: translateX(-4px); }
                  75% { transform: translateX(4px); }
                }
              `}</style>
              <circle cx="35" cy="50" r="5" fill="#000000" />
              <circle cx="75" cy="50" r="5" fill="#000000" />
            </g>
          )}

          {/* Tool Call 1: Glasses */}
          {expression === "tool-call-1" && (
            <g>
              <rect x="30" y="42" width="28" height="16" rx="4" fill="rgba(0,0,0,0.8)" />
              <rect x="62" y="42" width="28" height="16" rx="4" fill="rgba(0,0,0,0.8)" />
              <path d="M 58 48 L 62 48" stroke="rgba(0,0,0,0.8)" strokeWidth="4" />
              <path d="M 15 48 L 30 48" stroke="rgba(0,0,0,0.8)" strokeWidth="4" />
              <path d="M 90 48 L 105 48" stroke="rgba(0,0,0,0.8)" strokeWidth="4" />
              <rect x="34" y="44" width="8" height="4" rx="2" fill="rgba(255,255,255,0.4)" />
              <rect x="66" y="44" width="8" height="4" rx="2" fill="rgba(255,255,255,0.4)" />
            </g>
          )}

          {/* Tool Call 2: Sleeping Zzz */}
          {expression === "tool-call-2" && (
            <g>
              <text x="85" y="30" fill="#000000" fontSize="14" fontWeight="bold" opacity="0.8" style={{ animation: "claudius-zzz 2s infinite" }}>Z</text>
              <text x="95" y="20" fill="#000000" fontSize="10" fontWeight="bold" opacity="0.6" style={{ animation: "claudius-zzz 2s infinite 0.4s" }}>z</text>
              <text x="105" y="10" fill="#000000" fontSize="8" fontWeight="bold" opacity="0.4" style={{ animation: "claudius-zzz 2s infinite 0.8s" }}>z</text>
              <style>{`
                @keyframes claudius-zzz {
                  0%, 100% { opacity: 0; transform: translate(0,0) scale(0.8); }
                  50% { opacity: 1; transform: translate(2px,-2px) scale(1); }
                }
              `}</style>
            </g>
          )}

          {/* Tool Call 3: Scanning Laser */}
          {expression === "tool-call-3" && (
            <g>
               <line x1="20" y1="50" x2="100" y2="50" stroke="rgba(217, 119, 87, 0.8)" strokeWidth="3" style={{ animation: "claudius-laser 1.5s infinite alternate ease-in-out" }} />
               <style>{`
                @keyframes claudius-laser {
                  0% { transform: translateY(-10px); }
                  100% { transform: translateY(30px); }
                }
               `}</style>
            </g>
          )}

        </g>
      </svg>
    </div>
  );
};

export default AIFace;

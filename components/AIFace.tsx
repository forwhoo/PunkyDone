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
  size = 40,
  className = "",
}) => {
  const strokeColor = "currentColor";
  const sw = 20; // stroke width

  // --- EYES (the "4"-shaped lids from the 404 face) ---
  // Each eye is a polyline forming an inverted "V" lid (like the number 4)
  // and a short vertical dash below it as the pupil.

  // Pupil horizontal offset per expression (looking left/right/center)
  const pupilOffset: Record<FaceExpression, number> = {
    neutral: 0,
    thinking: -20,
    happy: 0,
    upset: 0,
    excited: 0,
    surprised: 0,
  };

  // Eyelid vertical squish (0 = open, positive = closing)
  // We translate the lid down to simulate half-closed eyes
  const lidDrop: Record<FaceExpression, number> = {
    neutral: 0,
    thinking: 12,
    happy: 14,
    upset: 10,
    excited: 0,
    surprised: 0,
  };

  // Pupil dash visibility (35 = visible, 0 = hidden for blink)
  const pupilDash: Record<FaceExpression, string> = {
    neutral: "28 28",
    thinking: "28 28",
    happy: "0 56", // hidden — happy has closed/squinted eyes
    upset: "28 28",
    excited: "28 28",
    surprised: "28 28",
  };

  // --- NOSE ---
  // Rectangular rounded nose, same as the 404 face
  const noseHeight: Record<FaceExpression, number> = {
    neutral: 110,
    thinking: 110,
    happy: 100,
    upset: 115,
    excited: 100,
    surprised: 120,
  };

  // --- MOUTH ---
  // Two cubic bezier halves (left + right) forming a smile/frown/O
  const mouthPaths: Record<FaceExpression, { left: string; right: string }> = {
    neutral: {
      left: "M 0 15 C 0 15 30 0 70 0",
      right: "M 70 0 C 110 0 140 15 140 15",
    },
    thinking: {
      // Flat/slightly offset line
      left: "M 0 5 C 0 5 30 8 70 5",
      right: "M 70 5 C 110 2 140 5 140 5",
    },
    happy: {
      // Big smile
      left: "M 0 0 C 0 0 30 40 70 40",
      right: "M 70 40 C 110 40 140 0 140 0",
    },
    upset: {
      // Frown (inverted curve)
      left: "M 0 30 C 0 30 30 0 70 0",
      right: "M 70 0 C 110 0 140 30 140 30",
    },
    excited: {
      // Wide open smile
      left: "M 0 0 C 0 0 25 50 70 50",
      right: "M 70 50 C 115 50 140 0 140 0",
    },
    surprised: {
      // Small "O" shape — we'll draw an ellipse instead
      left: "M 0 20 C 0 0 30 0 35 0",
      right: "M 35 0 C 40 0 70 0 70 20",
    },
  };

  // For surprised, also draw the bottom half of the "O"
  const surprisedBottomLeft = "M 0 20 C 0 40 30 40 35 40";
  const surprisedBottomRight = "M 35 40 C 40 40 70 40 70 20";

  // Mouth width/position adjustments for surprised (smaller O)
  const mouthTranslate: Record<FaceExpression, string> = {
    neutral: "translate(90, 280)",
    thinking: "translate(90, 278)",
    happy: "translate(90, 268)",
    upset: "translate(90, 275)",
    excited: "translate(90, 265)",
    surprised: "translate(125, 270)",
  };

  // --- THINKING BUBBLES ---
  const showThinkingBubbles = expression === "thinking";

  // --- EYEBROW TRANSFORMS ---
  // Only some expressions get visible brows
  const showBrows = ["upset", "surprised", "thinking"].includes(expression);

  const leftBrowD: Record<string, string> = {
    upset: "M 30 85 L 75 70", // angled down inward (angry)
    surprised: "M 30 68 L 75 68", // raised flat
    thinking: "M 30 75 L 75 68", // one slightly raised
  };
  const rightBrowD: Record<string, string> = {
    upset: "M 245 70 L 290 85",
    surprised: "M 245 68 L 290 68",
    thinking: "M 245 68 L 290 75",
  };

  const po = pupilOffset[expression];
  const ld = lidDrop[expression];

  return (
    <svg
      viewBox="0 0 320 380"
      width={size}
      height={size}
      className={`select-none ${className}`}
      style={{ display: "block" }}
      aria-label={`Harvey is ${expression}`}
    >
      <g
        fill="none"
        stroke={strokeColor}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={sw}
      >
        {/* ===== EYEBROWS ===== */}
        {showBrows && (
          <>
            <path
              d={leftBrowD[expression]}
              strokeWidth={sw * 0.6}
            />
            <path
              d={rightBrowD[expression]}
              strokeWidth={sw * 0.6}
            />
          </>
        )}

        {/* ===== LEFT EYE ===== */}
        <g transform="translate(15, 95)">
          {/* Lid — the "4" shaped inverted-V */}
          <polyline
            points="37,0 0,95 60,95"
            style={{
              transform: `translateY(${ld}px)`,
              transition: "transform 0.3s ease",
            }}
          />
          {/* Pupil — vertical dash */}
          <polyline
            points={`${42 + po},95 ${42 + po},123`}
            strokeDasharray={pupilDash[expression]}
            style={{
              transform: `translateX(${po}px)`,
              transition: "transform 0.3s ease, stroke-dasharray 0.3s ease",
            }}
          />
        </g>

        {/* ===== RIGHT EYE ===== */}
        <g transform="translate(215, 95)">
          {/* Lid */}
          <polyline
            points="37,0 0,95 60,95"
            style={{
              transform: `translateY(${ld}px)`,
              transition: "transform 0.3s ease",
            }}
          />
          {/* Pupil */}
          <polyline
            points={`${42 + po},95 ${42 + po},123`}
            strokeDasharray={pupilDash[expression]}
            style={{
              transform: `translateX(${po}px)`,
              transition: "transform 0.3s ease, stroke-dasharray 0.3s ease",
            }}
          />
        </g>

        {/* ===== NOSE ===== */}
        <rect
          rx="4"
          ry="4"
          x="138"
          y="120"
          width="44"
          height={noseHeight[expression]}
          style={{ transition: "height 0.3s ease" }}
        />

        {/* ===== MOUTH ===== */}
        <g transform={mouthTranslate[expression]}>
          <path d={mouthPaths[expression].left} />
          <path d={mouthPaths[expression].right} />
          {expression === "surprised" && (
            <>
              <path d={surprisedBottomLeft} />
              <path d={surprisedBottomRight} />
            </>
          )}
        </g>

        {/* ===== THINKING BUBBLES ===== */}
        {showThinkingBubbles && (
          <>
            <circle cx="290" cy="75" r="10" strokeWidth={sw * 0.4} />
            <circle cx="305" cy="50" r="6" strokeWidth={sw * 0.35} />
            <circle cx="313" cy="30" r="3.5" strokeWidth={sw * 0.3} />
          </>
        )}
      </g>
    </svg>
  );
};

export default AIFace;

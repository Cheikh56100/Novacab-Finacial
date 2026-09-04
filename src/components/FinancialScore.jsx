import React from "react";

import {
  financialScore,
  scoreLabel
} from "../services/financialEngine";

export default function FinancialScore({
  ratios
}) {

  const score = financialScore(ratios);

  return (
    <div className="scoreCard">

      <div>

        <div className="eyebrow">
          NFI FINANCIAL SCORE
        </div>

        <div className="scoreValue">
          {score}
          <small>/100</small>
        </div>

        <b>
          {scoreLabel(score)}
        </b>

        <p>
          Score indicatif calculé à partir
          de la rentabilité, de l'endettement,
          du BFR et du ROE.
        </p>

      </div>

      <div
        className="scoreRing"
        style={{
          "--score": `${score * 3.6}deg`
        }}
      >
        <span>
          {score}
        </span>
      </div>

    </div>
  );
}
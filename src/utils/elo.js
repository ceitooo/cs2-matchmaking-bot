const K_FACTOR = 32;

function expectedScore(ratingA, ratingB) {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}

function calculateNewElo(rating, expected, actualScore) {
  return Math.round(rating + K_FACTOR * (actualScore - expected));
}

function applyMatchResult(teamAAvg, teamBAvg, teamAWon) {
  const expectedA = expectedScore(teamAAvg, teamBAvg);
  const expectedB = 1 - expectedA;
  const actualA = teamAWon ? 1 : 0;
  const actualB = teamAWon ? 0 : 1;
  return {
    deltaA: calculateNewElo(0, expectedA, actualA),
    deltaB: calculateNewElo(0, expectedB, actualB)
  };
}

function balanceTeams(players) {
  const sorted = [...players].sort((a, b) => b.elo - a.elo);
  const teamA = [];
  const teamB = [];
  let sumA = 0;
  let sumB = 0;

  for (const player of sorted) {
    if (sumA <= sumB) {
      teamA.push(player);
      sumA += player.elo;
    } else {
      teamB.push(player);
      sumB += player.elo;
    }
  }

  return { teamA, teamB };
}

module.exports = { applyMatchResult, balanceTeams };

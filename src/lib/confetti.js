let confetti = null

async function getConfetti() {
  if (!confetti) {
    const mod = await import('canvas-confetti')
    confetti = mod.default
  }
  return confetti
}

export async function celebrateScore(score, total) {
  const pct = score / total
  const fire = await getConfetti()
  
  if (pct >= 0.9) {
    // Perfect / near-perfect: full fireworks
    fire({ particleCount: 120, spread: 90, origin: { y: 0.6 }, colors: ['#818cf8','#f97316','#34d399','#fbbf24'] })
    setTimeout(() => fire({ particleCount: 80, spread: 70, origin: { x: 0.1, y: 0.7 } }), 300)
    setTimeout(() => fire({ particleCount: 80, spread: 70, origin: { x: 0.9, y: 0.7 } }), 500)
  } else if (pct >= 0.7) {
    fire({ particleCount: 60, spread: 60, origin: { y: 0.65 } })
  } else if (pct >= 0.5) {
    fire({ particleCount: 30, spread: 50, origin: { y: 0.7 }, colors: ['#818cf8','#c7d7fe'] })
  }
}

export async function celebrateWinner(isWinner) {
  const fire = await getConfetti()
  if (isWinner) {
    fire({ particleCount: 200, spread: 100, origin: { y: 0.5 }, colors: ['#fbbf24','#f97316','#818cf8','#34d399'] })
    setTimeout(() => fire({ angle: 60, spread: 55, particleCount: 100, origin: { x: 0 } }), 200)
    setTimeout(() => fire({ angle: 120, spread: 55, particleCount: 100, origin: { x: 1 } }), 400)
  } else {
    fire({ particleCount: 40, spread: 40, origin: { y: 0.7 }, colors: ['#818cf8','#c7d7fe'] })
  }
}

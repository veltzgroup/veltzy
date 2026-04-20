import confetti from 'canvas-confetti'

export const triggerCelebration = () => {
  const defaults = {
    spread: 360,
    ticks: 100,
    gravity: 0.5,
    decay: 0.94,
    startVelocity: 30,
    colors: ['#22C55E', '#3B82F6', '#F59E0B', '#8B5CF6', '#06B6D4'],
  }

  confetti({
    ...defaults,
    particleCount: 50,
    scalar: 1.2,
    shapes: ['circle', 'square'],
    origin: { x: 0.5, y: 0.3 },
  })

  setTimeout(() => {
    confetti({
      ...defaults,
      particleCount: 30,
      scalar: 0.8,
      shapes: ['circle'],
      origin: { x: 0.3, y: 0.4 },
    })
  }, 200)

  setTimeout(() => {
    confetti({
      ...defaults,
      particleCount: 30,
      scalar: 0.8,
      shapes: ['square'],
      origin: { x: 0.7, y: 0.4 },
    })
  }, 400)
}

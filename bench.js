async page => {
  // Reusable perf benchmark for the Tidepool sim.
  // Requires the temporary window.__prof / window.__sim hooks in
  // tidepool.html (added for this optimization pass; removed once done).
  const POP = 50000;
  const FRAMES = 240;

  await page.evaluate((pop) => {
    window.__sim.state.population = pop;
    window.__sim.seedParticles(pop);
    window.__prof.step = 0;
    window.__prof.draw = 0;
    window.__prof.frames = 0;
  }, POP);

  await page.waitForFunction(
    (n) => window.__prof.frames >= n,
    FRAMES,
    { timeout: 60000 }
  );

  return await page.evaluate(() => {
    const p = window.__prof;
    const avgStepMs = p.step / p.frames;
    const avgDrawMs = p.draw / p.frames;
    const avgFrameMs = avgStepMs + avgDrawMs;
    return {
      population: window.__sim.state.population,
      frames: p.frames,
      avgStepMs: +avgStepMs.toFixed(3),
      avgDrawMs: +avgDrawMs.toFixed(3),
      avgFrameMs: +avgFrameMs.toFixed(3),
      estFps: +(1000 / avgFrameMs).toFixed(1)
    };
  });
}

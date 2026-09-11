async page => {
  // Reusable perf benchmark for the Tidepool sim.
  // Requires the temporary window.__prof / window.__sim hooks in
  // index.html (added for this optimization pass; removed once done).
  //
  // Pins every knob that newColony()'s Math.random() calls touch (rule
  // matrix, per-group mass/ratio, initial positions) via a seeded PRNG,
  // plus the dynamics sliders themselves, so repeated runs — including
  // runs of different code versions — are comparing like with like
  // instead of whatever ruleset/clustering happened to randomize in.
  const SEED = 0xC0FFEE;
  const POP = 50000;
  const FRAMES = 240;
  const DYNAMICS = { groupCount: 5, reach: 35, momentum: 0.75, spaceSize: 1600, timeScale: 1 };

  await page.evaluate(({ seed, pop, dynamics }) => {
    // mulberry32 — small, deterministic, good enough for a benchmark seed.
    function mulberry32(a){
      return function(){
        a |= 0; a = (a + 0x6D2B79F5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    }

    const sim = window.__sim;
    Object.assign(sim.state, dynamics);
    sim.state.population = pop;
    sim.buildGrid();
    sim.fitCamera();

    const originalRandom = Math.random;
    Math.random = mulberry32(seed);
    sim.newColony();
    Math.random = originalRandom;

    window.__prof.step = 0;
    window.__prof.draw = 0;
    window.__prof.frames = 0;
  }, { seed: SEED, pop: POP, dynamics: DYNAMICS });

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

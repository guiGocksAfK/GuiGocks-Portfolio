// A scene runs the animations of one section one at a time, in a fixed order, instead of each robot starting on its
// own. Components register their step on mount; the scene's trigger (scene-trigger.tsx) plays them when the section
// comes into view. A step that throws (e.g. its component unmounted) ends the scene. A scene can also be finished on the
// spot (the visitor teleporting in, see teleport.tsx): every step's finish puts its part in its final state at once,
// whether it had played, was playing or was still waiting.
type Step = { order: number; run: () => Promise<void>; finish?: () => void };

const scenes = new Map<string, Set<Step>>();
const running = new Set<string>();
const finished = new Set<string>();
const finishWaiters = new Map<string, (() => void)[]>();

export function registerStep(scene: string, order: number, run: () => Promise<void>, finish?: () => void) {
  const steps = scenes.get(scene) ?? new Set<Step>();
  scenes.set(scene, steps);
  const step = { order, run, finish };
  steps.add(step);
  return () => { steps.delete(step); };
}

export function sceneSteps(scene: string) {
  return [...(scenes.get(scene) ?? [])].sort((a, b) => a.order - b.order);
}

export function setSceneRunning(scene: string, on: boolean) {
  if (on) running.add(scene); else running.delete(scene);
}

// Background robots (the patrol brawl) hold back while any scene is playing.
export const anySceneRunning = () => running.size > 0;
export const isSceneRunning = (scene: string) => running.has(scene);

export const sceneFinished = (scene: string) => finished.has(scene);
export const whenSceneFinished = (scene: string) => new Promise<void>(resolve => {
  if (finished.has(scene)) resolve();
  else finishWaiters.set(scene, [...(finishWaiters.get(scene) ?? []), resolve]);
});

// Jumps a scene to its end: each step shows its part finished, and the scene's trigger stops playing it.
export function finishScene(scene: string) {
  if (finished.has(scene)) return;
  finished.add(scene);
  scenes.get(scene)?.forEach(step => step.finish?.());
  finishWaiters.get(scene)?.forEach(resolve => resolve());
  finishWaiters.delete(scene);
}

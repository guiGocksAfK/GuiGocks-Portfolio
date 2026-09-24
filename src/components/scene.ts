// A scene runs the animations of one section one at a time, in a fixed order, instead of each robot starting on its
// own. Components register their step on mount; the scene's trigger (scene-trigger.tsx) plays them when the section
// comes into view. A step that throws (e.g. its component unmounted) ends the scene.
type Step = { order: number; run: () => Promise<void> };

const scenes = new Map<string, Set<Step>>();
const running = new Set<string>();

export function registerStep(scene: string, order: number, run: () => Promise<void>) {
  const steps = scenes.get(scene) ?? new Set<Step>();
  scenes.set(scene, steps);
  const step = { order, run };
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

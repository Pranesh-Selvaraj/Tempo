import { trpcApi } from '../../lib/client';
import { usePlayStore, type PlaySnapshot } from '../../stores/playStore';

function sameJson(a: unknown, b: unknown): boolean {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
}

/**
 * Push an editor history snapshot to the server.
 *
 * Undo/redo restores local state immediately; this runs afterwards to make
 * the server match again: upserting missing keyframes by timestamp, deleting
 * removed rows, re-creating undone deletes (the create response replaces the
 * stale local id) and updating edited rows.
 */
export async function reconcilePlay(playId: string, target: PlaySnapshot): Promise<void> {
  const server = await trpcApi.play.get.query({ id: playId });

  // ── Keyframes are identified by their timestamp ─────────────────────────
  for (const keyframe of target.keyframes) {
    const existing = server.keyframes.find((k) => k.timestampMs === keyframe.timestampMs);
    if (
      !existing ||
      !sameJson(existing.playerStates, keyframe.playerStates) ||
      !sameJson(existing.ballState ?? null, keyframe.ballState ?? null)
    ) {
      const saved = await trpcApi.keyframe.upsert.mutate({
        playId,
        timestampMs: keyframe.timestampMs,
        playerStates: keyframe.playerStates,
        ballState: keyframe.ballState ?? null,
        cameraState: null,
      });
      usePlayStore.setState((state) => ({
        keyframes: state.keyframes
          .map((k) => (k.timestampMs === keyframe.timestampMs ? saved : k))
          .sort((a, b) => a.timestampMs - b.timestampMs),
      }));
    }
  }
  for (const keyframe of server.keyframes) {
    if (!target.keyframes.some((k) => k.timestampMs === keyframe.timestampMs)) {
      await trpcApi.keyframe.delete.mutate({ id: keyframe.id });
    }
  }

  // ── Trajectories ────────────────────────────────────────────────────────
  for (const row of target.trajectories) {
    const existing = server.trajectories.find((t) => t.id === row.id);
    if (!existing) {
      const saved = await trpcApi.trajectory.create.mutate({
        playId,
        type: row.type,
        controlPoints: row.controlPoints,
        startMs: row.startMs,
        durationMs: row.durationMs,
        color: row.color ?? undefined,
        visible: row.visible,
      });
      usePlayStore.setState((state) => ({
        trajectories: state.trajectories.map((t) => (t.id === row.id ? saved : t)),
      }));
      continue;
    }
    const changed = !sameJson(
      [existing.type, existing.controlPoints, existing.startMs, existing.durationMs, existing.color, existing.visible],
      [row.type, row.controlPoints, row.startMs, row.durationMs, row.color, row.visible],
    );
    if (changed) {
      await trpcApi.trajectory.update.mutate({
        id: row.id,
        type: row.type,
        controlPoints: row.controlPoints,
        startMs: row.startMs,
        durationMs: row.durationMs,
        color: row.color,
        visible: row.visible,
      });
    }
  }
  for (const row of server.trajectories) {
    if (!target.trajectories.some((t) => t.id === row.id)) {
      await trpcApi.trajectory.delete.mutate({ id: row.id });
    }
  }

  // ── Phases ──────────────────────────────────────────────────────────────
  for (const row of target.phases) {
    const existing = server.phases.find((p) => p.id === row.id);
    if (!existing) {
      const saved = await trpcApi.phase.create.mutate({
        playId,
        name: row.name,
        startMs: row.startMs,
        endMs: row.endMs,
        coachingNote: row.coachingNote ?? null,
      });
      usePlayStore.setState((state) => ({
        phases: state.phases
          .map((p) => (p.id === row.id ? saved : p))
          .sort((a, b) => a.startMs - b.startMs),
      }));
      continue;
    }
    const changed = !sameJson(
      [existing.name, existing.startMs, existing.endMs, existing.coachingNote ?? null],
      [row.name, row.startMs, row.endMs, row.coachingNote ?? null],
    );
    if (changed) {
      await trpcApi.phase.update.mutate({
        id: row.id,
        name: row.name,
        startMs: row.startMs,
        endMs: row.endMs,
        coachingNote: row.coachingNote ?? null,
      });
    }
  }
  for (const row of server.phases) {
    if (!target.phases.some((p) => p.id === row.id)) {
      await trpcApi.phase.delete.mutate({ id: row.id });
    }
  }

  // ── Annotations ─────────────────────────────────────────────────────────
  for (const row of target.annotations) {
    const existing = server.annotations.find((a) => a.id === row.id);
    if (!existing) {
      const saved = await trpcApi.annotation.create.mutate({
        playId,
        text: row.text,
        position: row.position,
        visibleFromMs: row.visibleFromMs ?? null,
        visibleToMs: row.visibleToMs ?? null,
        color: row.color,
      });
      usePlayStore.setState((state) => ({
        annotations: state.annotations.map((a) => (a.id === row.id ? saved : a)),
      }));
      continue;
    }
    const changed = !sameJson(
      [existing.text, existing.position, existing.visibleFromMs ?? null, existing.visibleToMs ?? null, existing.color],
      [row.text, row.position, row.visibleFromMs ?? null, row.visibleToMs ?? null, row.color],
    );
    if (changed) {
      await trpcApi.annotation.update.mutate({
        id: row.id,
        text: row.text,
        position: row.position,
        visibleFromMs: row.visibleFromMs ?? null,
        visibleToMs: row.visibleToMs ?? null,
        color: row.color,
      });
    }
  }
  for (const row of server.annotations) {
    if (!target.annotations.some((a) => a.id === row.id)) {
      await trpcApi.annotation.delete.mutate({ id: row.id });
    }
  }

  // ── Camera paths ────────────────────────────────────────────────────────
  for (const row of target.cameraPaths) {
    const existing = server.cameraPaths.find((p) => p.id === row.id);
    if (!existing) {
      const saved = await trpcApi.camera.createPath.mutate({
        playId,
        name: row.name,
        keyframes: row.keyframes,
        isDefault: row.isDefault ?? false,
      });
      usePlayStore.setState((state) => ({
        cameraPaths: state.cameraPaths.map((p) => (p.id === row.id ? saved : p)),
      }));
      continue;
    }
    const changed = !sameJson([existing.name, existing.keyframes], [row.name, row.keyframes]);
    if (changed) {
      await trpcApi.camera.updatePath.mutate({
        id: row.id,
        name: row.name,
        keyframes: row.keyframes,
      });
    }
  }
  for (const row of server.cameraPaths) {
    if (!target.cameraPaths.some((p) => p.id === row.id)) {
      await trpcApi.camera.deletePath.mutate({ id: row.id });
    }
  }
}

# Castorice body clips

The archive model only ships with facial animation, so the arms are posed in
code (`src/lib/castoriceScene.js`, `BODY_POSES`). This folder is the upgrade
path: drop an authored `.glb` here, register it in `manifest.json`, and it will
be played instead of the procedural preset with the same name.

## Names the viewer asks for

| Name   | When it plays                                      |
| ------ | -------------------------------------------------- |
| `idle` | always. This is the standing idle the archive uses. |
| `rest` | debug only — returns the arms to the bind A-pose.   |

The dialogue no longer changes the body pose. Any other name is still loadable
through `playClip(name)` on the scene API, it just is not triggered on its own.

## Manifest

```json
{
  "clips": [
    { "name": "idle", "file": "idle.glb", "loop": true, "fade": 0.5 }
  ]
}
```

- `name` — key the viewer uses. Use `idle` to replace the procedural idle.
- `file` — file name inside this folder (relative paths work too).
- `loop` — defaults to `true`. Keep the idle looping; one-shot clips stop and
  hold their last frame until the next pose.
- `fade` — crossfade in seconds, defaults to `0.35`.
- `clip` — optional animation name inside the `.glb` when the file contains
  more than one. The first animation is used otherwise.

If the manifest is missing, empty, or a file fails to load, the procedural pose
keeps working and the console logs a warning. Nothing breaks.

## Exporting from Blender

1. Import `public/castorice/scene.gltf` (File → Import → glTF 2.0). Keep the
   armature, skeleton and mesh names untouched.
2. Select the armature, enter Pose Mode. Animate only
   `Scapula_* → Shoulder_* → Elbow_* → Wrist_*` and the finger chains
   (`Index/Middle/Pinky/Ring/ThumbFinger{1,2,3}_{L,R}_*`).
   Do not move `Root_M_01`, `Hip_*`, `Knee_*` or the legs unless you also
   re-frame the camera — the archive crop is a portrait.
3. Name the action `idle` (or any key you will use with `playClip`). In Blender
   the action is the animation clip name.
4. Frame rate 30 fps. Start at frame 1. Make it loop seamlessly: the last pose
   should match the first, so the idle breathes without a visible cut.
5. File → Export → glTF 2.0 (`.glb`), with:
   - Format: `glTF Binary (.glb)`
   - Include: `Selected Objects`, and select the armature + skinned meshes
   - Animation: enabled, `Animation Mode: Actions`
   - Skinning: enabled
6. Drop the `.glb` in this folder and add its manifest entry. Reload the page
   and open the archive — `canvas.dataset.bodyClips` in devtools tells you how
   many clips were registered, and `canvas.dataset.bodyClip` shows the one
   currently playing.

Keep bone names identical. The loader binds clips by node name, so renamed
bones or a new root will silently do nothing.

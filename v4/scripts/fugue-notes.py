"""Build public/audio/fugue-notes.json, the falling-note data for the music card.

The notes come from the recording itself, so they follow its timing:

    pip install transkun pretty_midi
    ffmpeg -i v4/public/audio/fugue.m4a -ar 44100 fugue.wav
    transkun fugue.wav fugue.mid --device cpu
    python v4/scripts/fugue-notes.py fugue.mid v4/public/audio/fugue-notes.json

Each row is [startMs, durationMs, midiPitch, velocity]. If the range changes,
update personal.piano.range in content/personal.js to match.
"""
import json, sys
import pretty_midi

src, dst = sys.argv[1], sys.argv[2]
notes = sorted(
    (n for inst in pretty_midi.PrettyMIDI(src).instruments for n in inst.notes),
    key=lambda n: (n.start, n.pitch),
)
# Drop near-silent blips (very quiet and very short), the usual transcription ghosts.
notes = [n for n in notes if not (n.velocity < 36 and n.end - n.start < 0.07)]
rows = [[round(n.start * 1000), max(30, round((n.end - n.start) * 1000)), n.pitch, n.velocity] for n in notes]
data = {
    "piece": "J. S. Bach, Fugue No. 2 in C minor, BWV 847",
    "source": "Transcribed from audio/fugue.m4a with Transkun 2.0",
    "format": ["startMs", "durationMs", "midiPitch", "velocity"],
    "range": [min(r[2] for r in rows), max(r[2] for r in rows)],
    "notes": rows,
}
with open(dst, "w") as f:
    f.write(json.dumps(data, separators=(",", ":")) + "\n")
print(len(rows), "notes", data["range"])

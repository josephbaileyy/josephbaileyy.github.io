// First-person copy for the homepage. Keep personal additions here so they are
// easy to revise independently of the layout. Only established facts go live.
export const personal = {
  introduction:
    'I study physics and computer science at Stanford. Right now I’m working on neutrino physics, using machine learning to undo the distortions a detector adds to its measurements.',
  outside:
    'I also compete for Stanford Track & Field as a {track}, and I play classical and jazz piano and saxophone in a {sax}.',
  music:
    'I play classical piano (I finished MTAC Level 10) and jazz on alto saxophone, plus some flute and clarinet. The recording below is me playing a Bach fugue.',
  trackUrl: 'https://gostanford.com/sports/track-field/roster/player/joseph-bailey',
  saxUrl: 'https://www.youtube.com/watch?v=ry0rKeoQI0o',
  saxCaption: 'My sax solo in the Chino Hills HS 2023 indoor drumline show',
  piano: {
    src: './audio/fugue.m4a',
    // Note-by-note transcription of the recording, drawn as falling notes on play.
    notes: './audio/fugue-notes.json',
    // Lowest and highest MIDI pitches in the piece: C2 to C6.
    range: [36, 84],
    composer: 'J. S. Bach',
    title: 'Fugue No. 2 in C minor, BWV 847',
    collection: 'The Well-Tempered Clavier, Book I',
  },
};

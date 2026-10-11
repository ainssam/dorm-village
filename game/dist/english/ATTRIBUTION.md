# 소리숲 영어실 — content and media notes

Content reference check: 2026-10-04. All classroom examples, Korean explanations, exercises, role-play wording and the four-page story “Dormi’s Blue Pencil” were newly written for this DORMI activity. Common words and ordinary phrases are used as language facts. No British Council recording, worksheet, game, illustration or story is reproduced.

## Teaching references

- British Council, LearnEnglish Kids, [Word games](https://learnenglishkids.britishcouncil.org/grammar-vocabulary/word-games): everyday vocabulary activity scope
- British Council, LearnEnglish Kids, [Prepositions of place](https://learnenglishkids.britishcouncil.org/grammar-vocabulary/grammar-practice/prepositions-place): location grammar
- British Council, LearnEnglish Kids, [Directions](https://learnenglishkids.britishcouncil.org/grammar-vocabulary/word-games/directions): direction vocabulary
- British Council, LearnEnglish, [Ordering in a café](https://learnenglish.britishcouncil.org/free-resources/listening/a1/ordering-cafe?page=2): a beginner café situation

“낱말 → 짧은 문장 → 상황 대화” describes the activity sequence, not a certified language level or assessment. Sentence feedback compares the supplied chunks with the given target meaning; it does not claim that every other sentence is ungrammatical. Both offered polite café orders and both offered requests for directions are accepted.

## Pictures and spatial meaning

The newly produced picture sheet is `word-cards.webp`, with four columns and three rows. Cells are ordered book, pencil, chair, window / tree, flower, water, milk / apple, bread, school, library. Crops use CSS background positions; the corresponding Korean picture name remains available as text and an accessible label. Water is clear; milk is white. School shows a classroom; library shows bookshelves. Each dictionary image illustrates its headword; examples describe additional situations and are explicitly separated from the word picture.

The four story pictures are original renders of the existing DORMI scene and approved character, delivered as `book-page-1.webp` through `book-page-4.webp`. They depict the original story's desk, chair, pencil and star sequence. No new character or teacher design is introduced by the learning module.

The directions map is a standalone practice map. Starting at column 2, row 2 and facing north, the learner moves one cell north, turns left in place, then moves two cells west to the library at column 0, row 1. The displayed route and the bundled `directions-route` recording both say “Go straight. Turn left. Go straight again.” It is not presented as directions through the larger 3D village.

## Speech and accessibility

Bundled local speech uses Flite's SLT synthetic American English voice, labelled “미국 영어 합성음성” in the interface. Consult the audio manifest and the bundled speech license notices for asset and engine provenance. The module does not claim that this is a human recording or a verified native-speaker performance. Decode and lifecycle tests are technical checks; they are not a direct listening review. Final human audition remains an explicit verification boundary.

Playback begins only with a learner's button press. Replay, slower clips, stop and text are available. Playback failures reveal the text and never change an answer. Only one clip plays at a time; activity changes, close/disposal, page hiding and window blur stop it. No microphone, speech recognition, account, payment or personal-data collection is required. Sessions are local to the open activity and do not write a save file.

## Verification boundary

Automated Node tests exercise all twelve listening rounds, all six sentence targets, both café orders, valid polite replies, exact route positions, four-page navigation, focus after rerender, stale async playback, and repeated disposal/remount. These DOM fixtures do not constitute a real browser, touch-device or audible speech check. Such claims require a supported browser/device test and direct listening.

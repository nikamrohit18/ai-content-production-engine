# Cinematic Longform History SOP

Two reference channels torn down, both same broad niche as our own "Time
Excavated" channel (ancient history / empires / battles) but a heavier
production tier than our current Shorts/mid-form shot-first pipeline
(see `[[script_generation_pacing]]` in project memory). **The two formats
below are structurally different productions, not two flavors of one
recipe** — different script architecture, different voice pipeline, different
pacing math. Treat them as separate systems; do not merge their pacing
constants or prompt blocks.

This doc is intentionally tool-agnostic — every prompt block works pasted into
ChatGPT, Claude, DeepSeek, Grok, or run through our own `src/engine/ai/script.ts`
pipeline later if we decide to build dedicated format support.

---

## 0. Format comparison — which one are you building?

| | **Format A — Meditative Chapter Documentary** | **Format B — Dialogue-Driven Docudrama** |
|---|---|---|
| Reference channel | VLAD - Meditative History | Bannerlore |
| Reference video | "The Most Dangerous Empire of the Ancient World" (Parthia), 22:24 | "Marathon" (490 BC), 16:16 |
| Scale (at time of research) | 28 videos / 5 months, monetized | ~320 videos, ~30.5K subs, ~7.7M total views, ~0.6 uploads/week — see caveat below |
| Topic scope | Whole civilizations/empires, cradle-to-grave | Single battles/events, tightly scoped |
| Script form | Narration prose, one voice | Screenplay: action lines + multi-character dialogue |
| Structure | Cold open (unanswered question) → 5-6 numbered chapters with title cards → resolution | Cold open (ticking-clock in medias res) → continuous scene beats, no chapter cards seen → coda + spoken CTA |
| Visual holds | Slow, 15-40s per beat, meditative | Fast, dialogue/action-beat driven, likely 2-8s per beat |
| Voice pipeline | Single narrator voice | Narrator/description voice + a distinct voice per named character + crowd voices |
| Hardest production problem | Character/location consistency across many *stills* | Character consistency across *dialogue exchanges*, plus the lip-sync problem (§B.4) |
| Pacing math | Words-per-minute against one voice | Not WPM-drivable at all — see §B.6 |

**Scale caveat on Format B**: third-party aggregator data (channelslike.com,
via web search, 2026-07-22) shows Bannerlore at 320 total videos but the user's
own observation is the *current cinematic dialogue format* is ~9 months old —
those two facts together suggest a channel that pivoted format/rebranded
rather than one that produced 320 cinematic dialogue videos in 9 months.
Don't assume the full 320-video catalog is this format; the teardown below is
based on the actual sample video's script, which is solid ground regardless.

**Rule of thumb for picking a format per topic**: if the story is a slow
multi-century arc with an ironic "what happened to this civilization" throughline,
Format A fits. If the story is a single battle/event with named decision-makers
and a clock ticking toward a climax, Format B fits — and it's the more
proven sub-niche generically (its non-AI animated-history siblings, e.g.
Kings and Generals at 4.1M subs, SandRhoman History at 511K, have run this
exact dramatized-battle-narrative format for years — AI is displacing their
2D-animation cost, not inventing the format).

---

# Format A — Meditative Chapter Documentary

Reverse-engineered from "VLAD - Meditative History"
(youtube.com/watch?v=WVWCkIrChh0).

## A.1 Teardown

**Channel-level pattern**
- Anthology/series structure: each video covers one empire, thumbnail template
  is fixed (era-badge + hero character render, e.g. "PARTHIA 247 BC – 224 AD"),
  videos grouped under a YouTube "Series" tab. This is a *branding* device —
  it turns a one-off video into a collectible set and drives binge-watching
  ("From the series" sidebar), and it removes a creative decision (thumbnail
  layout) from every single upload.
- 28 videos in ~5 months (~1.4/week) reaching monetization that fast on
  20+ min videos implies strong average-view-duration, not raw upload volume —
  this format bets on watch-time-per-video, not output count.
- YouTube's **"ⓘ AI" disclosure badge** is visible under the title — this is
  the mandatory "Altered or synthetic content" toggle in YouTube Studio.
  It is clearly not hurting performance (1.1K likes on the sample video).
  **We must toggle this on every upload that uses AI-generated visuals/voice** —
  it's a policy requirement, not optional, and this channel proves it doesn't
  suppress reach.

**Script structure (mapped directly from the transcript + chapter list)**

```
COLD OPEN (~50s, no chapter card)
  → states a paradox/mystery as an unanswered question
    ("who erased it — its enemies or its own people?")

CHAPTER 1 (~4-5 min) — title card: "CHAPTER ONE. A PEOPLE FROM NOWHERE"
CHAPTER 2 (~4-5 min) — title card: "CHAPTER TWO. THE MAN WHO BUILT AN EMPIRE"
CHAPTER 3 (~4-5 min) — "THE BATTLE OF CARRHAE"
CHAPTER 4 (~3-4 min) — "500 YEARS OF WAR NOBODY WON"
CHAPTER 5 (~4-5 min) — "ERASED BY THEIR OWN HEIRS"
  → closing chapter directly resolves the cold-open question
  → ends on a sequel hook ("But that is a different story altogether")
```

Craft details worth stealing:
- **Planted payoff**: a line early in Ch.1 ("Remember this crack... because
  500 years later it is what will erase the Parthians") is explicitly paid
  off in Ch.5. This is a deliberate Chekhov's-gun structure, not a first-draft
  LLM output — it reads as at least one editing pass on top of a raw generation.
- **Chapter-end hooks**: every chapter ends mid-tension, pointing at the next
  ("a kingdom is not yet an empire... missing two things") — classic serialized
  pacing, keeps retention through a 20+ min runtime.
- **Tone**: short declarative sentences, rhetorical questions, explicit irony
  callouts ("Think about what this was..."), dense factual content (names,
  dates, battles) carried by narrative arcs rather than a dry recitation.
- **Chapter title cards** double as pacing devices: full black screen, 2-3s
  hold, bold caps, second clause partially highlighted in accent color. This
  also gives editors a hard cut point and the viewer a breath before the next
  beat — cheap to produce (it's a text template, not a generated visual).

**Visual style (from screenshots)**
- Photoreal, cinematic — shallow depth of field, consistent lighting/color
  grade, desert/battlefield staging. Reads as a movie still, not typical
  AI-artifact-heavy output.
- Burned-in captions throughout.
- One consistent "look" (grade, lens character, film grain) across all frames
  shown — this consistency is doing a lot of the "Hollywood" perception work,
  more than any single shot's raw fidelity.

## A.2 Reality check before you plan a budget

"22 minutes of true cinematic AI video" is very unlikely to be one continuous
video-generation pass, and you should not plan around that assumption:

- Premium video-gen models (Kling, Runway Gen-4, Veo) run **$1-6 per 5-8s
  clip** (this is the same pricing our own `[[video_generation_feature_plan]]`
  research already found for fal.ai). A 22-minute video at that clip length is
  ~165-260 clips → **$200-1,500+ per video** in video-gen cost alone, before
  script, voice, music, and editing time. At 28 videos in 5 months that's an
  implausible spend for a young, unproven channel.
- The far more likely — and industry-standard — approach (also the conclusion
  we already reached for our own channel, see `[[production-model-pivot]]`,
  after benchmarking against HistoryDose-style channels): **mostly high-quality
  stills with Ken Burns / parallax motion**, and **true video-generation reserved
  for a small number of "hero beats" per chapter** — the moments the video is
  actually about (the cavalry charge at Carrhae, the molten gold, the crown
  jewels of a scene). Most of a 4-5 min chapter is carried by 4-8 well-composed
  stills on slow motion, not by dozens of individually-generated video clips.
- **Character/prop consistency across dozens of scenes is the hardest
  unsolved problem generically**, not just for us. Realistic options, in order
  of effort: (a) a fixed style/consistency prompt block reused verbatim across
  every generation (cheapest, works reasonably well), (b) a reference image
  (a "character sheet" generated once) fed back into every subsequent
  image-to-image or image-gen call, (c) a custom LoRA/fine-tune per recurring
  character (overkill for one channel, revisit only if this becomes a
  dedicated product). Most channels at this tier accept some drift — at a
  20+ minute runtime with narration carrying attention, viewers don't
  scrutinize individual faces scene-to-scene.

**Recommendation: budget and plan for the hybrid model (stills + selective
video-gen), not full video-gen.** It's both cheaper and closer to what this
reference channel is almost certainly actually doing.

## A.3 What NOT to reuse from our existing pipeline

Our current `src/engine/ai/script.ts` is tuned for a **shot-first, 5-6s shot
cadence** (`WORDS_PER_MINUTE = 135`, 10-14 words/shot, 18-word hard ceiling —
see `[[script_generation_pacing]]`). That calibration was built for a punchier,
faster-cut Shorts/mid-form show and **does not transfer** to this chapter
format, which holds visuals for 15-30+ seconds at a time. Do not paste our
existing shot-length constants into this format's prompts. Measure narration
pace fresh against whatever ElevenLabs voice you pick for this show (record a
1-2 min test clip, count words, divide by minutes — same method already
validated for the other format, just don't assume the same number).

## A.4 The portable SOP

Five prompt blocks, meant to be run in sequence (same LLM or different ones —
each block's output is the next block's input). Copy-paste ready.

### Block A1 — Research & Angle Brief

```
You are a research assistant for a longform (20-22 minute) narrated history
documentary aimed at a general US YouTube audience.

Topic candidate: {EMPIRE / CIVILIZATION / EVENT}

Produce:
1. A one-sentence "paradox hook" — a genuinely surprising tension about this
   topic that can be posed as an unanswered question at the very start of the
   video and only resolved at the end (e.g. "an empire that beat Rome for 500
   years but was erased from its own descendants' epic poem in 27 lines").
2. 5-6 candidate chapter titles, each covering a distinct phase of the story
   (origin → rise → a defining conflict/turning point → consequence/decline →
   resolution of the paradox hook).
3. For each chapter: 4-6 concrete facts/events/names/dates to anchor it,
   with a note on source reliability (primary source, reputable secondary
   source, or contested/uncertain).
4. One "planted payoff" opportunity — a fact or line that can be stated early
   and explicitly paid off in the closing chapter.
5. Flag anything ethically/factually sensitive (contested historiography,
   colonial-era source bias, modern national-identity sensitivities) that
   needs careful framing rather than dramatized certainty.
```

### Block A2 — Master Script Prompt

```
Write the full narration script for a {TARGET_MINUTES}-minute narrated
history documentary. Target word count: {TARGET_MINUTES * MEASURED_WPM}
words total (measure MEASURED_WPM from an actual voice sample — do not
assume a number).

Structure, in order:
1. COLD OPEN (~150-200 words, no chapter heading): open with the paradox
   hook as a genuine unanswered question. Do not resolve it here.
2. {N} CHAPTERS (~{PER_CHAPTER_WORDS} words each), each preceded by a title
   card line in this exact format: "CHAPTER {N}. {TITLE IN CAPS}" — the title
   should read like a documentary intertitle, not a dry label.
3. Each chapter must end on a forward-pointing tension line into the next
   chapter — never a clean, settled stopping point until the final chapter.
4. The final chapter must explicitly resolve the cold-open question, and may
   end on a one-line sequel/franchise hook if a natural next topic exists.

Style rules:
- Short, declarative sentences. Vary rhythm — mix short punches with a few
  longer explanatory sentences, don't let every sentence be the same length.
- Use rhetorical questions sparingly (2-4 total), not as a tic.
- State irony/thematic weight explicitly at least once per chapter
  ("this is the moment that decided...", "notice what this really means...").
- Every named claim (date, casualty figure, quote) must be something you can
  actually defend — flag anything uncertain rather than stating it as fact.
- Plant at least one specific detail early that gets explicitly paid off
  later (see Block A1's "planted payoff").
- Do NOT write scene/camera directions inline — narration text only. Visual
  breakdown is a separate pass (Block A3).

Output as plain narration text with chapter headings marked exactly as
"CHAPTER {N}. {TITLE}" on their own line.
```

### Block A3 — Scene Breakdown (per chapter, run once per chapter)

```
Break the following chapter narration into scene beats for visual production.
A "scene beat" is 15-40 seconds of narration that will be carried by ONE
visual (a still with slow pan/zoom, or occasionally a short video clip).
Do not go shorter than 15s per beat — this is a slow, cinematic documentary
pace, not a fast-cut Shorts format.

For each beat output:
- beat_number
- narration_text (verbatim slice of the input, do not paraphrase)
- visual_type: "still" (default) or "video" — mark "video" for at most 1-2
  beats per chapter, reserved for the single most dramatic moment (a charge,
  a death, a reveal). Everything else is "still."
- image_prompt: subject, action/pose, setting, camera angle & lens
  (e.g. "35mm, shallow depth of field, low angle"), lighting, mood, and the
  STYLE CONSISTENCY BLOCK (see Block A4) appended verbatim at the end.
- video_prompt (only if visual_type is "video"): motion description only —
  camera move + subject motion, 1-2 sentences, assumes the still frame from
  image_prompt as the starting frame.
- consistency_notes: which recurring character/location/prop from the
  reference sheet (if any) appears in this beat, so the same visual identity
  can be reused across scenes.

Chapter narration:
{PASTE CHAPTER TEXT}
```

### Block A4 — Visual Style Bible (write once per video, reuse everywhere)

```
STYLE CONSISTENCY BLOCK (append verbatim to every image/video prompt for
this video):
"[era/culture] setting, photorealistic cinematic film still, [chosen grade
e.g. desaturated warm desert tones], anamorphic lens character, shallow
depth of field, natural/practical lighting, subtle film grain, no text, no
watermark, 16:9"

RECURRING CHARACTERS (fill in once you have a hero shot you like, then
reuse the description — and the actual reference image if your model
supports image-to-image/reference conditioning — in every subsequent
prompt featuring this character):
- {Character A}: {physical description, costume, one distinguishing detail}
- {Character B}: ...

RECURRING LOCATIONS: {2-3 sentence description per key location reused
across multiple chapters}
```

### Block A5 — Chapter Title Card Spec (production, not AI-generated)

```
Full black background. Two-line centered caption:
Line 1: "CHAPTER {N}."  — regular weight, all caps
Line 2: "{TITLE}"       — bold weight, all caps, final 1-2 words in accent
                           color (e.g. yellow), rest in white
Hold: 2.5-3s, no motion. Cut hard to next scene.
```
This is a template, not a generation — build it once in your editor
(CapCut/DaVinci/Remotion) and reuse it as a title-card asset for every
chapter of every video, only swapping the text.

## A.5 Voice, music, SFX

- **Voice**: pick (or keep) an ElevenLabs voice, but measure its actual WPM
  for *this* narration style before locking word budgets — don't reuse the
  135 WPM figure calibrated for the other show format (see §A.3). A slower,
  "meditative" documentary read is plausible here and will measure lower.
- **Music/SFX**: licensed stock (Epidemic Sound, Artlist, or similar) for
  orchestral score + battle/ambience SFX layering is standard practice at
  this tier — cheaper and more reliable than AI music generation, and it's
  what channels in this niche actually use per prior research
  (`[[production-model-pivot]]`).

## A.6 Assembly checklist

1. Generate stills (Block A3 output) with your chosen image model — premium
   tier for hero shots (Midjourney v7, Nano Banana 2, Flux 1.1 Pro), cheaper
   tier acceptable for filler/establishing beats.
2. Generate the 1-2 "video" beats per chapter via image-to-video (feed the
   still as first frame + the video_prompt), premium provider (Kling, Runway,
   Veo) — reserve spend for these, not for every beat.
3. Generate voiceover per chapter (or whole script) via ElevenLabs.
4. Build chapter title cards once as a reusable template (Block A5).
5. Assemble in CapCut/DaVinci: VO track → visuals timed to narration (avoid
   holding any single still longer than ~8-10s without at least a slow
   pan/zoom — this is the exact pacing bug we already root-caused in our own
   pipeline, see `[[production-model-pivot]]` finding #1) → title cards at
   chapter boundaries → music bed → SFX layer → burned-in captions.
6. Before publishing: toggle **"Altered or synthetic content"** in YouTube
   Studio (§A.1) — required disclosure, does not appear to hurt performance.

---

# Format B — Dialogue-Driven Docudrama

Reverse-engineered from **Bannerlore** (youtube.com/@Bannerlore), sample
video "Marathon" (youtube.com/watch?v=UebkPaosYrU), ~16:16 runtime.

## B.1 Teardown

**Channel-level pattern**
- Narrower topic scope than Format A: single named battles/events ("Marathon",
  presumably Thermopylae, Hydaspes, Hannibal's battles per web-search titles),
  not whole-civilization arcs. Each video is a self-contained mini-movie with
  a beginning/climax/aftermath, not one chapter of a larger empire story.
- Sits in a long-established sub-niche: dramatized ancient-battle narrative
  history (Kings and Generals, SandRhoman History, Invicta-style channels have
  run this exact story format — countdown-to-battle, war councils, named
  commanders, a climactic engagement — for years using 2D map animation).
  Bannerlore's differentiator is producing it with AI-generated cinematic
  visuals instead of animated maps/sprites — **the format is proven and the
  audience already exists; AI is a production-cost play, not a new genre bet.**
- Lower upload cadence than Format A (~1 video per 11-12 days vs. ~1.4/week) —
  consistent with a materially more labor-intensive production pipeline
  (multi-voice casting, tighter audio/visual sync — see B.4/B.5), not just a
  slightly shorter runtime.

**Script structure (mapped directly from the "Marathon" transcript)**

This is a **screenplay**, not narration prose — the fundamental architecture
difference from Format A. It alternates two line types that never overlap
(confirmed from the transcript: description lines and dialogue lines are
strictly sequential, never simultaneous):

1. **Action/description lines** — present tense, terse (often one short
   sentence), spoken by a neutral narrator voice. They do triple duty as
   scene direction, sound-design cue sheet, and pacing beat:
   > "Then hooves thunder through the streets. A scout rides into the city
   > at full speed. He nearly falls from the horse trying to dismount."
   Every sound effect in the finished video is implied directly by these
   lines (hoofbeats, crowd noise, "dust explodes across the battlefield",
   "bronze crashes into the Persian line") — there is no separate SFX-cue
   layer to write, the action line *is* the cue.
2. **Dialogue lines** — pure quoted speech, **no dialogue tags** ("he said" /
   "she replied" never appears). Speaker identity comes from context (the
   preceding action line, or established character voice) and, in
   production, from using a genuinely distinct voice per character:
   > "If we wait behind the walls," he says, "we surrender the countryside,
   > the roads, and the initiative."
   Early scenes use anonymous, overlapping-feeling crowd dialogue (panic in
   the Agora) with no names attached at all — several different unnamed
   voices in quick succession. Later scenes settle into named recurring
   characters (Miltiades, Callimachus, Arimnestos, Pheidippides) with
   distinct roles/personalities (the strategist, the deciding vote, the
   loyal ally, the messenger).

**Structural devices worth stealing:**
- **Ticking-clock cold open**, not a paradox question: "Three days before
  the battle, Athens still hoped..." — immediately in medias res, no
  scene-setting preamble.
- **Historiographical citation drops** embedded mid-scene, breaking the
  dramatization for one line to cite a real source: "According to
  Herodotus, the Persians believe the Athenians have gone mad." This is a
  credibility device — it reassures the viewer the drama is grounded in
  real historiography even while depicting invented dialogue.
- **Rapid beat rhythm**: many "beats" are a single short sentence, or even a
  one-two word exchange ("Where?" / "Marathon."). Scene transitions use bare
  connector words as their own paragraph: "Then—", "And then—". Tension
  beats are sometimes a single word: "Silence."
- **No chapter cards observed** in this transcript (unlike Format A) — the
  video reads as one continuous escalating scene rather than titled
  sections. Not confirmed absent from the actual video (no screenshots were
  reviewed for this one) — if you can pull the video's chapter list from
  YouTube, verify before assuming there's no chapter structure at all.
- **Coda + explicit spoken CTA**: after the battle resolves, a short
  aftermath beat (psychological shock across Greece, Darius already planning
  revenge, Xerxes inherits the throne) leads directly into a spoken sequel
  hook naming the next battle by name ("It will be at a narrow pass called
  Thermopylae. Watch it now.") — more explicit than Format A's implicit tease.

## B.2 Why this is a different production system, not a variant of Format A

Four problems Format A's SOP does not address at all:

1. **The script itself must be generated as a screenplay** (alternating
   ACTION lines and SPEAKER: "dialogue" lines) from the first generation
   pass — not written as prose and chunked afterward. This changes the
   master-script prompt architecture, not just its wording.
2. **Voice production needs a cast, not a narrator.** At minimum: one neutral
   description/narrator voice, one distinct ElevenLabs voice per named
   recurring character, and a plan for anonymous crowd lines (a small
   rotating pool of generic voices, or cheap pitch/EQ variation on a base
   voice, so three different "citizens" don't sound like the same person).
   The script must be speaker-tagged at generation time so each line can be
   routed to the right voice and the final mix assembled from multiple
   TTS stems, not one continuous pass.
3. **Sound design is a first-class deliverable, not a bed track.** Because
   action lines double as the SFX cue sheet, whoever assembles the video
   needs a much heavier foley/ambience library (hoofbeats, crowd panic,
   weapon impacts, dust, surf, ship timbers) synced beat-by-beat, not just a
   music bed with occasional stingers.
4. **The lip-sync problem.** Named characters deliver dialogue on-screen —
   if the shot shows a speaking face, viewers will notice a mismatched mouth
   far faster than they'd notice a slightly-different face between two
   establishing stills (Format A's tolerance for drift does not apply here).
   Two ways to handle it, and the cheap one is standard craft in this exact
   genre already:
   - **Avoid needing lip-sync at all** (recommended default): frame dialogue
     shots so the mouth isn't the focus — helmets/masks/beards obscuring the
     mouth, profile or from-behind framing, extreme close-up on the
     listener's reaction instead of the speaker, silhouettes against
     firelight, cutaways to hands/weapons/environment while the line plays.
     This is exactly how the non-AI animated-history channels in this same
     sub-niche (Kings and Generals etc.) have always handled dialogue —
     it's a proven craft trick, not a compromise unique to AI production.
   - **Actual lip-sync** (Sync Labs, HeyGen, or a video model with native
     lip-sync) — more expensive, higher failure rate, only worth it for a
     handful of true hero close-ups if at all. Don't default to this.

## B.3 Visual style — character consistency matters more here than Format A

Named characters recur across multiple back-to-back dialogue exchanges
within one video (Miltiades appears in at least four separate scenes talking
to different people). Viewers will notice inconsistency during a exchange in
a way they won't between two establishing stills 8 minutes apart in Format A.
**Skip straight to reference-image conditioning** (Format A's §A.2 tier "b")
for any named character with more than one dialogue scene — generate a clean
character portrait first, then feed it as an image-to-image/reference input
for every subsequent generation of that character, rather than relying on a
text-only style-consistency block.

## B.4 The portable SOP

### Block B1 — Research & Angle Brief (single-event variant)

```
You are a research assistant for a ~15-18 minute dramatized history
docudrama about a single battle/event, aimed at a general US YouTube
audience. The finished piece will be a screenplay (action + dialogue), not
narration — dialogue will be invented/dramatized but must stay plausible to
the historical record.

Topic candidate: {BATTLE / SIEGE / SINGLE EVENT}

Produce:
1. A ticking-clock framing device — a concrete time-to-climax marker to open
   on (e.g. "three days before the battle", "the night before the vote").
2. A cast list: 3-6 named historical figures who were plausibly present and
   whose real recorded actions/decisions give them a clear dramatic role
   (the strategist, the reluctant ally, the messenger, the doubter). Note
   what's actually attested about each vs. what would need to be invented
   for scene purposes.
3. 2-4 decision points/councils in the real history where people plausibly
   argued or debated — these become the dialogue-heavy scenes.
4. The single most visually dramatic moment (the climax beat) — this is the
   one scene worth spending premium video-gen budget on.
5. 3-5 citable facts/quotes suitable for a mid-scene historiographical aside
   (e.g. "according to Herodotus...") to ground the dramatization.
6. Flag anything where invented dialogue risks misrepresenting a real,
   named historical figure's actual documented words/positions — keep
   invented lines plausible-in-character, not fabricated quotes attributed
   as real.
```

### Block B2 — Master Screenplay Prompt

```
Write a ~{TARGET_MINUTES}-minute screenplay for a dramatized history
docudrama, in the following format — this is a SCREENPLAY, not narration
prose:

ACTION lines: present tense, one short sentence per line typically, describe
what's seen/heard. These lines will be read aloud by a neutral narrator
voice AND double as the sound-design cue sheet, so make the implied sound
explicit where it matters (hoofbeats, crowd noise, weapon impacts, wind,
surf) rather than only visual description.

DIALOGUE lines: format as
SPEAKER_NAME: "line"
(use "CROWD" or a descriptive placeholder like "REFUGEE" for anonymous/
unnamed speakers). No dialogue tags ("he said") — attribution comes from the
SPEAKER_NAME field only, not from prose.

Structure:
1. COLD OPEN: a ticking-clock time marker (see Block B1) into immediate
   in-medias-res action — no throat-clearing scene-setting.
2. Rising escalation through 2-4 dialogue-heavy decision/council scenes,
   alternating with action-line scene transitions.
3. One climax action sequence (the battle/event itself) — this section
   should be action-line-dominant with short, punchy dialogue fragments
   (single words/short phrases under stress are more realistic than full
   sentences mid-battle).
4. A brief coda (aftermath, historical consequence, 3-5 sentences).
5. A closing sequel hook naming the next real historical event in the
   sequence if one exists, ending on a direct spoken CTA ("Watch it now"
   or equivalent).

Style rules:
- Vary beat length aggressively — some beats are one word/short exchange,
  others are a full paragraph of action. Do not normalize toward uniform
  sentence length; the rhythm IS the pacing.
- Drop in 1-2 historiographical citation asides mid-scene ("According to
  {source}...") without breaking the scene's momentum.
- Keep invented dialogue in-character and plausible, never a fabricated
  direct quote attributed as historically real unless it is genuinely
  attested.
- No camera directions or shot descriptions inline — that's a separate pass
  (Block B3).
```

### Block B3 — Voice Cast & Scene Breakdown

```
Given the screenplay below, produce:

1. VOICE CAST: one row per SPEAKER_NAME (including "narrator" for ACTION
   lines and any crowd placeholders), with a one-line voice description
   (age, tone, accent register) suitable for picking an ElevenLabs voice.
   Named characters need genuinely distinct voices from each other.

2. SCENE BEATS: break the screenplay into beats — a beat is either one
   continuous ACTION passage or one DIALOGUE exchange, whichever is
   shorter/more natural, NOT a fixed word-count or time-length (this
   format's pacing is dialogue-performance-driven — see the doc's note on
   pacing math, don't apply a words-per-minute rule here). For each beat:
   - beat_number, speaker (or "narrator"), line_text (verbatim)
   - sfx_cue: any sound effect implied by this line, if it's an action line
   - visual_type: "still" (default) or "video" (mark at most 2-3 per video,
     reserved for the climax sequence)
   - image_prompt: full scene description + camera framing. For DIALOGUE
     beats, explicitly specify a lip-sync-avoidance framing (helmet/profile/
     from-behind/listener-reaction-shot/silhouette — pick one) unless this
     beat is a deliberately budgeted true lip-sync hero shot.
   - video_prompt (video beats only): motion description, camera move +
     subject motion, assumes the still as first frame.
   - consistency_notes: which cast member / recurring location appears.

Screenplay:
{PASTE SCREENPLAY}
```

### Block B4 — Character Reference Sheet Prompt (run once per named character before scene generation)

```
Generate a clean character reference portrait for use as a consistency
anchor across an entire video:

Character: {NAME}, {role/one-line description}
Era/culture: {...}
Physical description: {age, build, distinguishing features}
Costume/equipment: {specific, era-accurate detail}
Framing: neutral 3/4 portrait, plain/neutral background, even lighting,
photorealistic, no text, no watermark — reference-sheet style, not a
finished cinematic shot.

Use this image as an image-to-image/reference input for every subsequent
generation featuring this character.
```

## B.5 Sound & music

- **Foley/SFX is not optional texture here — it's specified line-by-line by
  the action lines.** Build (or license) a battle/ancient-warfare SFX
  library: hoofbeats, crowd murmur/panic, weapon clashes, dust/impact,
  surf/ships, wind — expect meaningfully more SFX editing time per minute
  of video than Format A.
- **Music**: same recommendation as Format A — licensed stock (Epidemic
  Sound, Artlist), orchestral bed with dynamic swells timed to the
  escalation structure, not a flat ambient loop.
- **Voice mixing**: narrator/description-voice stem and each character's
  dialogue stem are separate TTS generations that get assembled in the
  timeline — budget real editing time for this vs. Format A's single
  continuous VO track.

## B.6 Pacing — this cannot be a words-per-minute model at all

Format A's pacing knob is words-per-minute against one steady narrator
voice, which produces a fairly uniform beat length. Format B's rhythm is
**dialogue-performance-driven**: a beat's on-screen duration is however long
that specific line actually takes a voice actor to deliver — "Where?" /
"Marathon." is a two-beat exchange lasting maybe 2 seconds combined, while a
tense council speech might run 15+ seconds. There is no target word count
that makes this rhythm come out right; **measure and time each generated
voice line after the fact and let visual beat lengths follow the actual
audio, rather than trying to pre-budget word counts per beat.** This is the
core reason Format B's pacing must stay a fully separate system from Format
A's `WORDS_PER_MINUTE`-style constant — not just a different number, a
different kind of measurement entirely.

## B.7 Assembly checklist

1. Generate the screenplay (Block B2), then the voice cast + scene breakdown
   (Block B3).
2. Generate character reference portraits (Block B4) for every named
   character with more than one scene, before generating any scene visuals.
3. Generate TTS per line/stem, routed to the correct cast voice — assemble
   into a rough VO timeline first, since Format B's visual timing follows
   the actual recorded line lengths (§B.6), not a pre-computed budget.
4. Generate stills for each beat (image-to-image against the character
   reference where applicable), reserving premium video-gen for the 2-3
   climax beats only.
5. Build the SFX layer beat-by-beat against the action-line cues, then the
   music bed.
6. Assemble in CapCut/DaVinci against the VO timeline from step 3 (visuals
   fit the audio here, not the reverse) → SFX → music → burned-in captions.
7. Before publishing: toggle **"Altered or synthetic content"** in YouTube
   Studio, same as Format A.

---

## Open questions to resolve before scaling either format

- Per-video budget ceiling for each format (Format B is very likely
  materially more expensive per minute than Format A given the voice-cast
  and reference-image requirements — worth costing out before committing to
  a cadence).
- Whether to build either as a second/third format inside
  `ai-content-production-engine` (new niche/format templates, fully separate
  pacing systems from the existing shot-first pipeline and from each other)
  or run manually via this doc first to validate a format works for us
  before investing in engine support.
- If pursuing Format B: which lip-sync-avoidance framing techniques (§B.2.4)
  to standardize as defaults vs. which scenes are worth true lip-sync spend.
- Character/location consistency tier to start at for each format — Format A
  can start cheap (style-block only); Format B should start at
  reference-image conditioning (§B.3) given dialogue-scene scrutiny.

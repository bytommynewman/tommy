Complete game concept, rules, visual experience, public appeal, and
product improvement strategy

Prepared 26 October 2026 \| Screenshot reference: playdaily.org/krillion

![](media/image1.jpeg){width="6.9in" height="4.258593613298338in"}

Figure 1. User-provided screenshot of the Krillion Unlimited landing
screen.

# 1. Executive summary

Krillion is an ocean-themed, open-answer trivia game in which the goal
is not merely to provide a correct response but to give an uncommon
correct response. Rarer answers earn more points and translate into
greater ocean depth. The visual experience shown in the supplied
screenshot uses pixel art, bright sky, a sea surface, progressively
darker underwater scenery, arcade-style typography, and large
contrasting action buttons.

Important source distinction: the supplied screenshot shows
playdaily.org/krillion, labelled "Krillion Unlimited," whereas some
previously discussed descriptions referenced krillion.io. This document
describes what is visible in the screenshot and treats other gameplay
details from the earlier analysis as reported rules that should be
verified against the specific live version before implementation.

# 2. Exact description of the visible website

-   At the top is a white Daily / Krillion navigation bar with the
    tagline "only uncommon answers score," social icons, a
    coffee-support button, theme toggle, and other-game navigation.

-   The main game panel is a wide pixel-art seascape: cyan sky, sun and
    clouds, a small island and lighthouse, a boat, fish, and deep blue
    water with silhouettes of sea life.

-   The title reads "KRILLION UNLIMITED," followed by "THE CLASSIC DIVE"
    and "7 prompts, 25 seconds each, the less common your answer the
    further you go."

-   Top-left of the game panel: a gem/currency counter reading 36,040
    and a SHOP button. Top-right: audio toggle.

-   A "SAVE YOUR PROGRESS" control sits above CLASSIC and ENDLESS tabs;
    CLASSIC is selected in the screenshot.

-   A prominent pink "BEGIN DESCENT" button starts the primary
    experience.

-   Secondary dark buttons: "PLAY MULTIPLAYER" (619 playing), "PLAY 1 VS
    1" (177 playing), and "PLAY KRILLOCITY" (82 racing), as displayed at
    screenshot time.

-   Below is a personal record: "BEST CLASSIC: 2,520m."

-   On the right is a promotional "PLAY NOILLIRK" pop-up and a small
    video overlay. These compete for attention with the main call to
    action.

# 3. Game concept and intended player experience

The game presents categories or prompts that allow multiple valid
answers. A familiar response may be correct but earn a small reward; a
surprising, defensible response should earn more. The depth metaphor
makes performance visible: the better the uncommon answer, the further
the player dives. The core appeal is the tension between answering
quickly and finding something genuinely obscure.

## Illustrative round

Prompt: "Name a European country." France and Liechtenstein are both
valid, but the latter is likely less obvious. This example illustrates
the strategy, not a verified scoring assignment for that prompt.

# 4. Rules and scoring

## Rules explicitly visible in the screenshot

-   Classic has seven prompts.

-   The screen advertises 25 seconds per prompt.

-   Less common answers are rewarded with greater distance/depth.

-   The page offers Classic and Endless options plus multiplayer, 1v1,
    and Krillocity entries.

## Previously reported mechanics --- verify against this version

-   A short preview may precede each timed prompt.

-   Players type free-text answers, which are checked against accepted
    answers or aliases.

-   A seven-round total may be compared with a personal best.

-   Some versions use a six-tier rarity ladder, shown below; the
    screenshot does not independently confirm these tiers.

  -----------------------------------------------------------------------
  Reported tier           Points                  Depth equivalent
  ----------------------- ----------------------- -----------------------
  Plankton                10                      100 m

  Too Clever              15                      150 m

  Schooler                30                      300 m

  Rare                    60                      600 m

  Deep Cut                85                      850 m

  One in a Krillion       100                     1,000 m
  -----------------------------------------------------------------------

Under this previously reported model, seven 100-point answers produce
700 points or 7,000 m. The screenshot's best score of 2,520 m is
consistent with depth-based scoring but does not prove the precise point
conversion or rarity ladder.

# 5. Modes and surrounding features

  -----------------------------------------------------------------------
  Feature                 What is visible / known What still needs
                                                  verification
  ----------------------- ----------------------- -----------------------
  Classic                 Selected mode; seven    Exact retry and failure
                          timed prompts           rules

  Endless                 Selectable tab          How rounds, difficulty
                                                  and scoring progress

  Multiplayer             Dedicated button and    Lobby, elimination, and
                          live-looking count      scoring rules

  1 vs 1                  Dedicated button and    Matchmaking, turn
                          count                   order, rematches

  Krillocity              Racing mode button and  Race format, scoring,
                          count                   win condition

  Shop / currency         Gem balance and Shop    How currency is earned
                                                  and spent

  Save progress           Prominent save control  Account requirement and
                                                  persistence

  Noillirk                Promotional link        Relationship to main
                                                  game
  -----------------------------------------------------------------------

# 6. Strengths of the current design

-   Distinctive pixel-art identity and recognizable ocean metaphor.

-   A simple hook that can be explained in one sentence.

-   Large pink primary call to action that is easy to locate.

-   Short seven-question format suited to quick play.

-   Several social and replay options visible on the home screen.

-   Personal best and currency systems create potential progression
    incentives.

# 7. Friction points and opportunities

-   The home screen presents many competing actions, which may overwhelm
    a first-time visitor.

-   A first-time player cannot see exactly how a "less common" answer is
    determined before starting.

-   A 25-second timer may disadvantage players unfamiliar with the
    premise or typing on mobile.

-   If legitimate answers are rejected, the rarity-based scoring system
    can feel unfair.

-   The Noillirk pop-up and video overlay obscure part of the scene and
    distract from starting a game.

-   Modes such as Krillocity and Endless lack concise explanations on
    the visible landing screen.

-   Displayed concurrent-player counts are time-specific and should not
    be treated as enduring activity metrics.

# 8. Review research: evidence and limits

The preceding conversation discussed the creator's FAQ, official pages,
third-party guides, and limited community commentary. The main reported
concerns were opaque "Too Clever" scoring, incomplete accepted-answer
lists, accidental alias/autocorrect matching, and timer pressure.
However, this document does not claim a representative review sample,
independently verified sentiment percentages, or a completed multi-agent
research audit. The screenshot itself is the strongest direct evidence
for the exact current appearance of this playdaily.org page.

# 9. Recommended improvements for broad public appeal

## 1. Explain rarity transparently

After each answer, show the accepted answer, rarity tier, points/depth
and a one-sentence reason. Distinguish editorial rarity from real player
submission frequency.

## 2. Improve answer checking

Support aliases, spelling variations and transparent correction; add a
simple appeal/report control. Audit rejected answers frequently.

## 3. Add a 30-second tutorial

Let new players try two untimed examples and compare an obvious answer
with an obscure answer before a scored game.

## 4. Reduce landing-screen clutter

Keep Begin Descent as the main focus; group secondary modes under a
compact Play Modes menu and make promotional overlays dismissible.

## 5. Add accessible practice

Preserve the competitive 25-second Classic mode but offer untimed
practice and longer timers outside ranked play.

## 6. Make results more rewarding

Animate the dive, reveal the depth, show personal-best improvement, and
create an attractive share card.

## 7. Make multiplayer instantly understandable

Explain each mode in one line and let friends join by link or room code
with minimal signup friction.

## 8. Improve mobile usability

Autofocus the answer field, keep the keyboard from covering the timer,
offer readable type and reduced-motion settings.

## 9. Add fair long-term progression

Introduce cosmetic sea-creature collectibles, achievements, weekly
challenges and optional themed packs without pay-to-win boosts.

## 10. Broaden question coverage

Balance geography, science, sports, pop culture, everyday knowledge and
regions; review cultural bias and prompt ambiguity.

# 10. Proposed feature priorities

  -----------------------------------------------------------------------
  Priority          Initiative        Impact estimate   Complexity
  ----------------- ----------------- ----------------- -----------------
  P0                Answer validation Very high         Medium--high
                    and score                           
                    explanation                         

  P0                New-player        High              Low
                    onboarding                          

  P1                Cleaner homepage  High              Medium
                    and mobile UX                       

  P1                Results sharing   High              Medium
                    and replay                          
                    feedback                            

  P2                Simultaneous      Very high         High
                    multiplayer                         
                    answer reveals                      

  P2                Expanded          Medium            Medium--high
                    achievements and                    
                    themed packs                        
  -----------------------------------------------------------------------

# 11. Measurement and experiments

Test a tutorial versus no tutorial, explanation versus score-only
results, and the current homepage versus a simplified landing page.
Track first-game completion, next-day return, dispute rate, share rate,
and percentage of visitors who start a round. Proposed exploratory
targets (not actual Krillion metrics): 80% first-game completion, 35%
next-day return, 15% result sharing, and fewer than 2% disputed
responses.

# 12. Product vision

Keep the original core: seven quick prompts, clever uncommon answers,
and an ocean descent. Improve trust through clearer validation, improve
accessibility through better onboarding and practice, and improve
word-of-mouth through memorable results and frictionless friend
competition. The strongest positioning is "the trivia game where being
right is only the beginning."

# Reference and verification notes

User screenshot: playdaily.org/krillion (26 October 2026). Previously
discussed public references: krillion.io; krillion.io/faq;
krillion.io/privacy; nisu.io/guides/krillion-multiplayer/. Because these
references may represent different versions or operators, do not assume
every feature and rule transfers unchanged between domains.

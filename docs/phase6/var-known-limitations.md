# VAR — known limitations (Phase 6)

## Offside is a label, not an engine incident

The match engine does not simulate offside. Offside trap is only an attack/defense modifier.

When VAR is enabled, the VAR random stream may label an open-play goal that the engine has already scored as offside (`truth = no_goal`). That label is `gameTuning.VAR.offsideLabelRate`, scaled by the referee's strictness and foul sensitivity. It is not a separate offside event, and it does not consume the engine's main random stream.

The broadcast copy ("Checking possible offside…", "disallowed for offside") refers to this label.

## Also unchanged in this phase

- Handballs are not modeled, so VAR never reviews one.
- A red card still does not reduce the team to ten players. Overturning it corrects the card record and the red-card count only.
- Ordinary fouls, yellow cards, corners, and saves never open a review. A penalty can be awarded only inside a penalty the engine already produced, when the referee's initial call withheld the kick.
- VAR runs only for the user's live, instant, and skip matches. The background league simulator does not call it.
- The on/off switch is the `varEnabled` argument of `FootballMatchEngine`, default `false`. It is not a value in `gameTuning`.

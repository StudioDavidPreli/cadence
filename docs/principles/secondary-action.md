# Secondary Action

A character crosses the room. That is the action. The arms swing, the head tilts, a coat shifts: those are secondary, and they confirm the walk without competing with it. The test of a secondary action is subordination. The moment it pulls the eye away from the thing it is supporting, it has stopped being secondary and started being noise.

## UI demonstration

The expanded card renders the Dropdown from Token Lab. Opening the menu is the primary action; the chevron rotating to point up is the secondary one. Both run on `duration.fast` and `ease.standard`, so they read as a single coordinated gesture rather than two separate events. The rotation carries no information the menu does not already give. It confirms the open state, and confirmation is the whole job of a secondary action.

## Animation

`/public/rive/secondaryaction.riv`, state machine `secondaryActionSM`. View model `ViewModel1` with `Light`, `Dark`, `Contrast` instances. Wired in `PrincipleAnimation` as principle 8.

## Icon

`/public/rive/principles_icon08.riv`, state machine `secondaryActionIconSM`. Wired in `PrincipleIcon` as principle 8.

## Tokens used

`duration.fast`, `ease.standard` (menu and chevron share one timing so they read as one gesture).

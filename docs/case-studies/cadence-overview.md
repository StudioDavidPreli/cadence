# Cadence: A Plain Overview

**Status: Draft branch, 2026-07-30.** The general-audience version of [`case-study.md`](../case-study.md): what the tool does, in plain language, without the engineering depth. The full case study carries the decision records and the hiring-manager material.

---

## What it is

Press a button on a well-made website and it gives a little, then comes back. Someone decided how much it gives and how fast it returns. Cadence is a tool for looking at those decisions, changing them, and watching what changes.

It is a free web tool, live at [cadence.davidpreli.com](https://cadence.davidpreli.com). It has three parts, and all three run on the same small set of shared values.

## The idea underneath

A design token is a named decision. Instead of writing "200 milliseconds" in forty places across an app, you write it once, give it a name, and the forty places ask for the name. Change the value and everything that asked for it changes together. Design systems have worked this way for color and spacing for years. Cadence does it for motion, and makes the connection visible: you drag a slider, and every component listening to that name moves differently in the same second.

## The three tools

**Token Lab** is the control room. Sliders govern how long animations take, how they accelerate and settle, how long they wait before starting, and how far they travel. Drag one and a set of familiar components (buttons, cards, toggles, progress bars) retimes in front of you. Three presets named Snappy, Standard, and Cinematic swap whole personalities at once. A tuned set can be saved, or exported as a file an engineer can use directly.

**The Principles Library** is a grid of eighteen cards: the classic twelve principles of animation, plus six additions for people who build systems rather than single animations. Each card opens into a pair, an illustration of the principle on one side and a real interface component demonstrating it on the other, driven by the same values Token Lab edits. Anticipation is not a bouncing ball here; it is a drawer that lifts slightly before it leaves.

**Motion Tiles** is the same vocabulary at scale: a field of more than fifty animated tiles running on one clock. Pick a preset and every tile changes character together. Drag the stagger control and the change crosses the field like a wave.

## Three decisions worth knowing about

The components are not pretending. Each demonstration reads its timing from the token layer at the moment it runs, the same way a production design system would. When you drag a slider, you are editing the same kind of value an engineering team ships.

The tool protects itself from you, politely. You can drag durations to extremes and the demonstrations will obey, but the interface's own feedback (hovers, menus, page transitions) runs on separate fixed values, so the tool never becomes unusable in your hands.

And motion can be turned off. For people whose devices ask for reduced motion, the interface communicates everything without requiring them to process movement. That support runs through the whole tool, and it is also one of the eighteen cards.

## Who it is for

Motion designers curious what happens to their craft inside a design system. Engineers curious why 100 milliseconds and 400 milliseconds feel like different people. Anyone who has pressed a button and wondered why it felt good.

The argument, if the tool has one: putting motion into a system does not flatten it. Naming a value is how one person's timing judgment reaches every corner of an interface at once.

Drag the fastest slider from 50 to 350 and press the button again. It is a different button now.

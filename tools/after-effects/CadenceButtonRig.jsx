/*
  Cadence Button Rig
  After Effects script (ExtendScript). Builds the Cadence Button as a live rig:
  one shape layer, one text layer, two control layers, and no baked keyframes on
  anything that a token owns.

  The architecture mirrors the web component it reproduces. In the app, tokens
  are CSS custom properties and Framer Motion reads them at runtime. Here, tokens
  are effect controls on a "TOKENS Motion" layer and every expression reads them
  at render time. Nothing in the rig carries a hardcoded duration, easing, or
  scale value. Change a token slider and the whole button retimes, exactly as
  editing a custom property does in Token Lab.

  The press is triggered by keyframes on a checkbox. The expressions walk that
  checkbox's keyframes, find the last press-down and release before the current
  frame, and drive scale from those two times through the token durations and the
  token bezier curves. A release that lands before the press finishes starts from
  wherever the press actually got to, the same as the browser does.

  Install: put this file in
    After Effects > Scripts > ScriptUI Panels
  and restart AE. Open it from the Window menu. It also runs from
  File > Scripts > Run Script File.

  Requires AE 17.1 or newer for the text style expression (font size and color
  driven live). Older versions still build, the label just falls back to its own
  typed style.

  Written for the Cadence case study video. Token values match
  src/tokens/motion.css and src/tokens/color.css as of 2026-08-03.
*/

(function cadenceButtonRig(thisObj) {

  // ---------------------------------------------------------------------------
  // Data
  // ---------------------------------------------------------------------------

  // Theme colors, lifted from src/tokens/color.css. Order matters: the Theme
  // dropdown is 1-based and indexes this array.
  var THEMES = [
    {
      label: 'Dark',
      s:  '1e1e1e',  // --color-surface        (button fill, rest)
      sh: '262626',  // --color-surface-hover
      sp: '111111',  // --color-surface-press
      sr: '1a1a1a',  // --color-surface-raised (the plate the button sits on)
      bg: '141414',  // --color-bg
      b2: '3d3d3d',  // --color-border2        (the resting stroke)
      tp: 'e1e1e1',  // --color-text-primary
      ac: '76c17d'   // --color-accent         (focus ring)
    },
    {
      label: 'Light',
      s:  '1a1a1a', sh: '333333', sp: '111111', sr: 'ffffff',
      bg: 'f5f5f5', b2: 'cccccc', tp: 'ffffff', ac: '5a4fcf'
    },
    {
      // In both high-contrast themes border2 equals the button fill, so the
      // stroke disappears. That is the CSS behavior, reproduced rather than
      // corrected. Hover carries no fill shift either, which is why the ring
      // does the work below.
      label: 'High Contrast Light',
      s:  '000000', sh: '000000', sp: '000000', sr: 'ffffff',
      bg: 'ffffff', b2: '000000', tp: 'ffffff', ac: '855a0d'
    },
    {
      label: 'High Contrast Dark',
      s:  'ffffff', sh: 'ffffff', sp: 'ffffff', sr: '000000',
      bg: '000000', b2: 'ffffff', tp: '000000', ac: 'aaccf6'
    }
  ];

  // The three built-in presets from src/data/motionPresets.js. Applying one
  // writes values into the token controls. It does not add expressions, so the
  // tokens stay hand-editable and keyframable after a preset lands.
  var PRESETS = [
    {
      label: 'Standard',
      dur: [100, 200, 400, 600],
      delay: [50, 100, 200],
      scale: [0.98, 0.95, 0.9, 1.02],
      spring: [170, 20, 1.5],
      // Standard reads as the standard curve.
      easeStd: [[0.4, 0], [0.2, 1]],
      easeOvr: [[0.34, 1.56], [0.64, 1]]
    },
    {
      label: 'Snappy',
      dur: [60, 120, 200, 350],
      delay: [20, 40, 80],
      scale: [0.97, 0.93, 0.87, 1.04],
      spring: [600, 22, 1],
      // Snappy remaps the standard slot to the overshoot curve. Same move the
      // preset makes in the app.
      easeStd: [[0.34, 1.56], [0.64, 1]],
      easeOvr: [[0.34, 1.56], [0.64, 1]]
    },
    {
      label: 'Cinematic',
      dur: [200, 500, 900, 1400],
      delay: [100, 200, 400],
      scale: [0.99, 0.97, 0.94, 1.01],
      spring: [180, 26, 1.2],
      // Cinematic remaps the standard slot to the enter curve, so general
      // motion decelerates into rest.
      easeStd: [[0, 0], [0.2, 1]],
      easeOvr: [[0.34, 1.56], [0.64, 1]]
    }
  ];

  var L_CTRL  = 'CTRL Button';
  var L_TOK   = 'TOKENS Motion';
  var L_FACE  = 'Button Face';
  var L_LABEL = 'Button Label';
  var L_RING  = 'Button Focus Ring';
  var L_PLATE = 'BG Plate';

  // ---------------------------------------------------------------------------
  // Small helpers
  // ---------------------------------------------------------------------------

  function hexToFloats(hex) {
    var r = parseInt(hex.substr(0, 2), 16) / 255;
    var g = parseInt(hex.substr(2, 2), 16) / 255;
    var b = parseInt(hex.substr(4, 2), 16) / 255;
    return [r, g, b];
  }

  function round4(n) {
    return Math.round(n * 10000) / 10000;
  }

  function lines(arr) {
    return arr.join('\n');
  }

  function effects(layer) {
    return layer.property('ADBE Effect Parade');
  }

  // Every control is read in expressions by index, effect("Name")(1), so a
  // slider, a checkbox, a point and a dropdown are all reached the same way.
  // That is what lets the dropdown fall back to a slider on older versions
  // without any expression knowing the difference.
  function addSlider(layer, name, value) {
    var e = effects(layer).addProperty('ADBE Slider Control');
    e.name = name;
    e.property(1).setValue(value);
    return e;
  }

  function addCheckbox(layer, name, value) {
    var e = effects(layer).addProperty('ADBE Checkbox Control');
    e.name = name;
    e.property(1).setValue(value ? 1 : 0);
    return e;
  }

  function addPoint(layer, name, value) {
    var e = effects(layer).addProperty('ADBE Point Control');
    e.name = name;
    e.property(1).setValue(value);
    return e;
  }

  // Dropdown Menu Control needs AE 17.0 for setPropertyParameters. If it is not
  // available the control becomes a plain slider holding the same 1-based index.
  // The fallback keeps the same effect name on purpose: expressions read every
  // control as effect(name)(1), so neither form needs a branch.
  function addDropdown(layer, name, items, value) {
    var e = null;
    try {
      e = effects(layer).addProperty('ADBE Dropdown Control');
      e.name = name;
      e.property(1).setPropertyParameters(items);
      e.property(1).setValue(value);
      return e;
    } catch (err) {
      if (e) { try { e.remove(); } catch (err2) {} }
      var s = effects(layer).addProperty('ADBE Slider Control');
      s.name = name;
      s.property(1).setValue(value);
      return s;
    }
  }

  // Shape sub-properties live in a dynamic group where names are display names
  // ("Fill 1"), so they are found by matchName instead.
  function byMatch(group, matchName) {
    for (var i = 1; i <= group.numProperties; i++) {
      if (group.property(i).matchName === matchName) { return group.property(i); }
    }
    return null;
  }

  function findLayer(comp, name) {
    for (var i = 1; i <= comp.numLayers; i++) {
      if (comp.layer(i).name === name) { return comp.layer(i); }
    }
    return null;
  }

  // Returns the rig layers of the active comp, or null with an alert.
  function getRig(quiet) {
    var comp = app.project.activeItem;
    if (!(comp && comp instanceof CompItem)) {
      if (!quiet) { alert('Open the button comp first.'); }
      return null;
    }
    var ctrl = findLayer(comp, L_CTRL);
    var tok = findLayer(comp, L_TOK);
    if (!ctrl || !tok) {
      if (!quiet) { alert('No Cadence button rig in this comp. Build one first.'); }
      return null;
    }
    return {
      comp: comp,
      ctrl: ctrl,
      tok: tok,
      face: findLayer(comp, L_FACE),
      label: findLayer(comp, L_LABEL),
      ring: findLayer(comp, L_RING),
      plate: findLayer(comp, L_PLATE)
    };
  }

  // The single value of a named effect control, whatever kind of control it is.
  function ctrlProp(layer, name) {
    var fx = effects(layer);
    for (var i = 1; i <= fx.numProperties; i++) {
      if (fx.property(i).name === name) { return fx.property(i).property(1); }
    }
    return null;
  }

  // ---------------------------------------------------------------------------
  // Expression preamble
  //
  // Every expression in the rig opens with this block. It is the whole token
  // layer expressed as functions: durSec, delaySec, scaleToken, ease, and the
  // theme table. Nothing below it ever writes a number that a token owns.
  // ---------------------------------------------------------------------------

  function themeTableSource() {
    var rows = [];
    for (var i = 0; i < THEMES.length; i++) {
      var t = THEMES[i];
      var keys = ['s', 'sh', 'sp', 'sr', 'bg', 'b2', 'tp', 'ac'];
      var parts = [];
      for (var k = 0; k < keys.length; k++) {
        var c = hexToFloats(t[keys[k]]);
        parts.push(keys[k] + ':[' + round4(c[0]) + ',' + round4(c[1]) + ',' + round4(c[2]) + ']');
      }
      rows.push('  {' + parts.join(', ') + '}' + (i < THEMES.length - 1 ? ',' : '') +
                '   // ' + t.label);
    }
    return lines(rows);
  }

  function preamble() {
    return lines([
      '// --- Cadence rig preamble (generated, do not hand-edit) ---------------',
      'var CTRL = thisComp.layer("' + L_CTRL + '");',
      'var TOK  = thisComp.layer("' + L_TOK + '");',
      'function ctrl(n) { return CTRL.effect(n)(1).value; }',
      'function tok(n)  { return TOK.effect(n)(1).value; }',
      '',
      '// Theme colors, straight from src/tokens/color.css.',
      'var TH = [',
      themeTableSource(),
      '];',
      'function C(k) {',
      '  var i = Math.round(ctrl("Theme")) - 1;',
      '  if (i < 0) { i = 0; }',
      '  if (i > 3) { i = 3; }',
      '  return TH[i][k];',
      '}',
      '// Shape color properties want four components; setFillColor wants three.',
      'function C4(k) { var c = C(k); return [c[0], c[1], c[2], 1]; }',
      '',
      '// Token lookups. The dropdowns hold 1-based indexes into these ladders,',
      '// so "which token drives this" is itself an editable choice.',
      'function durSec(idx) {',
      '  var n = ["Duration Fast (ms)", "Duration Base (ms)", "Duration Slow (ms)", "Duration Slower (ms)"];',
      '  var i = Math.round(idx);',
      '  if (i < 1) { i = 1; }',
      '  if (i > 4) { i = 4; }',
      '  return tok(n[i - 1]) / 1000 * tok("Retime Scalar (video only)");',
      '}',
      'function delaySec(idx) {',
      '  var n = ["", "Delay Short (ms)", "Delay Medium (ms)", "Delay Long (ms)"];',
      '  var i = Math.round(idx);',
      '  if (i < 2) { return 0; }',
      '  if (i > 4) { i = 4; }',
      '  return tok(n[i - 1]) / 1000 * tok("Retime Scalar (video only)");',
      '}',
      'function scaleToken(idx) {',
      '  var n = ["Scale Press Subtle", "Scale Press Base", "Scale Press Expressive", "Scale Lift"];',
      '  var i = Math.round(idx);',
      '  if (i < 1) { i = 1; }',
      '  if (i > 4) { i = 4; }',
      '  return tok(n[i - 1]);',
      '}',
      '// A curve is two control points. p0 and p3 are pinned at 0,0 and 1,1,',
      '// same as a CSS cubic-bezier().',
      'function ease(n) {',
      '  return [TOK.effect("Ease " + n + " P1")(1).value, TOK.effect("Ease " + n + " P2")(1).value];',
      '}',
      '',
      '// --- cubic-bezier(), reimplemented ------------------------------------',
      '// CSS gives easing as a bezier and solves x for t every frame. AE has no',
      '// equivalent, so the curve is solved here: Newton first, bisection as the',
      '// backstop when the slope goes flat. Eight iterations is past visible',
      '// error at any duration this rig runs.',
      'function bezAt(t, a, b) {',
      '  var u = 1 - t;',
      '  return 3 * u * u * t * a + 3 * u * t * t * b + t * t * t;',
      '}',
      'function bezSlope(t, a, b) {',
      '  var u = 1 - t;',
      '  return 3 * u * u * a + 6 * u * t * (b - a) + 3 * t * t * (1 - b);',
      '}',
      'function bezT(x, ax, bx) {',
      '  var t = x;',
      '  var i, d, err;',
      '  for (i = 0; i < 8; i++) {',
      '    err = bezAt(t, ax, bx) - x;',
      '    if (Math.abs(err) < 0.00001) { return t; }',
      '    d = bezSlope(t, ax, bx);',
      '    if (Math.abs(d) < 0.000001) { break; }',
      '    t = t - err / d;',
      '  }',
      '  var lo = 0, hi = 1;',
      '  t = x;',
      '  for (i = 0; i < 24; i++) {',
      '    var xx = bezAt(t, ax, bx);',
      '    if (Math.abs(xx - x) < 0.00001) { return t; }',
      '    if (xx > x) { hi = t; } else { lo = t; }',
      '    t = (lo + hi) / 2;',
      '  }',
      '  return t;',
      '}',
      '// e is [[p1x,p1y],[p2x,p2y]]. y is free to leave 0..1, which is exactly',
      '// how the overshoot curve gets past its target and settles back.',
      'function curve(x, e) {',
      '  if (x <= 0) { return 0; }',
      '  if (x >= 1) { return 1; }',
      '  return bezAt(bezT(x, e[0][0], e[1][0]), e[0][1], e[1][1]);',
      '}',
      '',
      '// --- checkbox as a trigger --------------------------------------------',
      '// The state machine. It reads the checkbox keyframes and returns the last',
      '// press-down time and the release that followed it, both relative to the',
      '// current frame. With no keyframes the checkbox is a static toggle, which',
      '// is what makes it useful for holding a state while you look at it.',
      'function toggleTimes(p) {',
      '  var down = -1, up = -1;',
      '  if (p.numKeys > 0) {',
      '    for (var i = 1; i <= p.numKeys; i++) {',
      '      var k = p.key(i);',
      '      if (k.time > time + 0.000001) { break; }',
      '      if (k.value > 0.5) { down = k.time; up = -1; }',
      '      else if (down >= 0) { up = k.time; }',
      '    }',
      '    return [down, up];',
      '  }',
      '  if (p.value > 0.5) { return [time - 1000, -1]; }',
      '  return [-1, -1];',
      '}',
      '// 0 is rest, 1 is fully engaged. The return can exceed 1 or dip below 0',
      '// when the release curve overshoots, and callers just lerp with it.',
      'function toggleProgress(p, durIn, durOut, easeIn, easeOut, delayIn) {',
      '  var t = toggleTimes(p);',
      '  var down = t[0], up = t[1];',
      '  if (down < 0) { return 0; }',
      '  var start = down + delayIn;',
      '  var dIn = Math.max(durIn, 0.000001);',
      '  var dOut = Math.max(durOut, 0.000001);',
      '  if (up < 0 || time < up) {',
      '    if (time <= start) { return 0; }',
      '    return curve(Math.min((time - start) / dIn, 1), easeIn);',
      '  }',
      '  // Released. Start the return from wherever the press actually reached,',
      '  // not from the token target: a tap shorter than duration.fast never got',
      '  // there, and the browser returns from the same partial value.',
      '  var atRelease = (up <= start) ? 0 : curve(Math.min((up - start) / dIn, 1), easeIn);',
      '  return atRelease * (1 - curve(Math.min((time - up) / dOut, 1), easeOut));',
      '}',
      '',
      '// --- geometry ----------------------------------------------------------',
      '// The outer border box, in comp pixels. Width comes from the rendered text,',
      '// so the button grows with the label. Height does NOT: it comes from font',
      '// size times a line factor, because sourceRectAtTime measures ink and ink',
      '// height changes with descenders. A button that got shorter when the label',
      '// lost its "y" would be wrong. CSS sizes the same box off the line box.',
      'function faceOuter() {',
      '  var z = ctrl("Zoom");',
      '  var r = thisComp.layer("' + L_LABEL + '").sourceRectAtTime(time, false);',
      '  var padX = ctrl("Padding X") * z;',
      '  var padY = ctrl("Padding Y") * z;',
      '  var bw = ctrl("Border Width") * z;',
      '  var h = ctrl("Font Size") * z * ctrl("Line Factor") + 2 * padY + 2 * bw;',
      '  return [r.width + 2 * padX + 2 * bw, h];',
      '}',
      '// --- end preamble -------------------------------------------------------',
      ''
    ]);
  }

  // ---------------------------------------------------------------------------
  // Expressions
  // ---------------------------------------------------------------------------

  function exprFaceScale() {
    return preamble() + lines([
      '// The press. Squash on the press token curve, release on the overshoot',
      '// curve, both timed by whichever duration token the dropdowns point at.',
      '// This is the Button component\'s whileTap plus its release transition,',
      '// with the same two curves doing the same two jobs.',
      'var target = scaleToken(tok("Press Scale Token")) * 100;',
      'var f = toggleProgress(',
      '  CTRL.effect("Press")(1),',
      '  durSec(tok("Press Duration Token")),',
      '  durSec(tok("Release Duration Token")),',
      '  ease("Standard"),',
      '  ease("Overshoot"),',
      '  delaySec(tok("Press Delay Token"))',
      ');',
      'var s = 100 + f * (target - 100);',
      '[s, s]'
    ]);
  }

  function exprFaceSize() {
    return preamble() + lines([
      '// The stroke sits on the path centerline and AE has no inside stroke, so',
      '// the path is pulled in by one stroke width. That puts the outer edge of',
      '// the stroke where the CSS border box edge is.',
      'var o = faceOuter();',
      'var bw = ctrl("Border Width") * ctrl("Zoom");',
      '[o[0] - bw, o[1] - bw]'
    ]);
  }

  function exprFaceRoundness() {
    return preamble() + lines([
      'var z = ctrl("Zoom");',
      'Math.max(ctrl("Corner Radius") * z - ctrl("Border Width") * z / 2, 0)'
    ]);
  }

  function exprFaceStrokeWidth() {
    return preamble() + 'ctrl("Border Width") * ctrl("Zoom")';
  }

  function exprFaceFill() {
    return preamble() + lines([
      '// Rest, hover, press. The CSS transitions background-color on',
      '// duration.fast with the standard curve, so the color blend reads the',
      '// same token the press does rather than a chrome constant.',
      'var d = durSec(1);',
      'var e = ease("Standard");',
      'var h = toggleProgress(CTRL.effect("Hover")(1), d, d, e, e, 0);',
      'var p = toggleProgress(CTRL.effect("Press")(1), d, d, e, e, 0);',
      'var rest = C("s"), hov = C("sh"), prs = C("sp");',
      'var out = [];',
      'for (var i = 0; i < 3; i++) {',
      '  var a = rest[i] + (hov[i] - rest[i]) * h;',
      '  out[i] = a + (prs[i] - a) * p;',
      '}',
      '[out[0], out[1], out[2], 1]'
    ]);
  }

  function exprFaceStrokeColor() {
    return preamble() + lines([
      '// border2. In both high-contrast themes this equals the fill and the',
      '// stroke vanishes, which is what the component does.',
      'C4("b2")'
    ]);
  }

  function exprLabelSource() {
    return preamble() + lines([
      '// Size, tracking and color are token-driven; the string is not. `value`',
      '// stays the typed text, so the label can be retyped on the layer and the',
      '// style still comes from the controls. Tracking 10 is the CSS',
      '// letter-spacing of 0.01em, in AE thousandths of an em.',
      '// The try/catch is the version gate: the style API landed in AE 17.1, and',
      '// without it the layer just keeps its own character panel settings. The',
      '// result is assigned rather than left as a bare statement, so the value',
      '// this expression returns is the same one in both branches.',
      'var out;',
      'try {',
      '  out = text.sourceText.style',
      '    .setFontSize(ctrl("Font Size") * ctrl("Zoom"))',
      '    .setTracking(ctrl("Tracking"))',
      '    .setFillColor(C("tp"));',
      '} catch (err) {',
      '  out = value;',
      '}',
      'out'
    ]);
  }

  function exprLabelAnchor() {
    return lines([
      '// Center the ink box on the anchor so the label sits in the middle of the',
      '// face at any string length.',
      'var r = thisLayer.sourceRectAtTime(time, false);',
      '[r.left + r.width / 2, r.top + r.height / 2]'
    ]);
  }

  function exprLabelPosition() {
    return preamble() + lines([
      '// Parented to the face, so this is face-local. Optical nudge only.',
      '[0, ctrl("Baseline Nudge") * ctrl("Zoom")]'
    ]);
  }

  function exprRingSize() {
    return preamble() + lines([
      '// outline: 2px solid, outline-offset: 2px. The stroke is centered, so the',
      '// path runs offset + half a stroke width outside the border box.',
      'var z = ctrl("Zoom");',
      'var o = faceOuter();',
      'var g = 2 * (ctrl("Focus Ring Offset") * z + ctrl("Focus Ring Width") * z / 2);',
      '[o[0] + g, o[1] + g]'
    ]);
  }

  function exprRingRoundness() {
    return preamble() + lines([
      'var z = ctrl("Zoom");',
      'ctrl("Corner Radius") * z + ctrl("Focus Ring Offset") * z + ctrl("Focus Ring Width") * z / 2'
    ]);
  }

  function exprRingWidth() {
    return preamble() + 'ctrl("Focus Ring Width") * ctrl("Zoom")';
  }

  function exprRingOpacity() {
    return preamble() + lines([
      '// Two ways for the ring to show. Keyboard focus, in every theme. And',
      '// hover in the high-contrast themes only, where surface-hover equals',
      '// surface and the fill shift carries no signal at all.',
      'var d = durSec(1);',
      'var e = ease("Standard");',
      'var f = toggleProgress(CTRL.effect("Focus")(1), d, d, e, e, 0);',
      'var h = toggleProgress(CTRL.effect("Hover")(1), d, d, e, e, 0);',
      'var p = toggleProgress(CTRL.effect("Press")(1), d, d, e, e, 0);',
      'var hc = (Math.round(ctrl("Theme")) >= 3) ? h : 0;',
      '// :active drops the outline.',
      'Math.max(f, hc) * (1 - p) * 100'
    ]);
  }

  function exprRingColor() {
    return preamble() + lines([
      '// Accent when it is a focus ring. The surface color when it is the',
      '// high-contrast hover ring: a black ring around the black button, held',
      '// off the edge by the offset gap.',
      'var d = durSec(1);',
      'var e = ease("Standard");',
      'var f = toggleProgress(CTRL.effect("Focus")(1), d, d, e, e, 0);',
      'var a = C("ac"), s = C("s");',
      '[s[0] + (a[0] - s[0]) * f, s[1] + (a[1] - s[1]) * f, s[2] + (a[2] - s[2]) * f, 1]'
    ]);
  }

  function exprPlateSize() {
    return '[thisComp.width, thisComp.height]';
  }

  function exprPlateColor() {
    return preamble() + lines([
      '// surface-raised, the demo plate the button sits on in the app. In dark',
      '// that is a four point step under the button fill, 1.05:1, which is the',
      '// whole reason the button carries a stroke.',
      'C4("sr")'
    ]);
  }

  function exprPlateOpacity() {
    return preamble() + 'ctrl("Show Plate") * 100';
  }

  // ---------------------------------------------------------------------------
  // Build
  // ---------------------------------------------------------------------------

  function buildRig(opts) {
    app.beginUndoGroup('Build Cadence Button Rig');

    var comp = app.project.items.addComp(
      opts.name, opts.width, opts.height, 1, opts.duration, opts.fps
    );
    comp.bgColor = hexToFloats(THEMES[opts.theme - 1].bg);
    comp.openInViewer();

    // Layers are created bottom up, because each new layer lands on top.
    var plate = addShapeLayer(comp, L_PLATE, false);
    var face  = addShapeLayer(comp, L_FACE, true);
    var ring  = addShapeLayer(comp, L_RING, true);
    // The ring is stroke only. An outline has no fill.
    byMatch(shapeGroup(ring), 'ADBE Vector Graphic - Fill').remove();

    var label = comp.layers.addText(opts.text);
    label.name = L_LABEL;
    setLabelBaseStyle(label, opts);

    var tokens = comp.layers.addNull();
    tokens.name = L_TOK;
    var ctrl = comp.layers.addNull();
    ctrl.name = L_CTRL;

    // Nulls are rig, not artwork.
    tokens.guideLayer = true;
    ctrl.guideLayer = true;

    buildCtrlControls(ctrl, opts);
    buildTokenControls(tokens);

    label.parent = face;
    ring.parent = face;
    ring.property('ADBE Transform Group').property('ADBE Position').setValue([0, 0]);

    wireExpressions(comp, face, label, ring, plate);

    app.endUndoGroup();
    return comp;
  }

  function addShapeLayer(comp, name, withStroke) {
    var sl = comp.layers.addShape();
    sl.name = name;
    var grp = sl.property('ADBE Root Vectors Group').addProperty('ADBE Vector Group');
    grp.name = 'Face';
    var contents = grp.property('ADBE Vectors Group');
    var rect = contents.addProperty('ADBE Vector Shape - Rect');
    rect.name = 'Rect';
    // Stroke above fill so it draws over it, the same z-order a border has.
    if (withStroke) { contents.addProperty('ADBE Vector Graphic - Stroke'); }
    contents.addProperty('ADBE Vector Graphic - Fill');
    return sl;
  }

  function setLabelBaseStyle(label, opts) {
    var srcProp = label.property('ADBE Text Properties').property('ADBE Text Document');
    var td = srcProp.value;
    td.justification = ParagraphJustification.CENTER_JUSTIFY;
    td.fontSize = opts.fontSize * opts.zoom;
    td.tracking = 10;
    td.applyFill = true;
    td.fillColor = hexToFloats(THEMES[opts.theme - 1].tp);
    td.applyStroke = false;
    // The house font. A missing font silently falls back, so this is a best
    // effort and the Character panel is the fix.
    var candidates = ['IBMPlexMono-Medium', 'IBMPlexMono-Regular', 'IBM Plex Mono'];
    for (var i = 0; i < candidates.length; i++) {
      try { td.font = candidates[i]; break; } catch (e) {}
    }
    srcProp.setValue(td);
  }

  function buildCtrlControls(layer, opts) {
    var themeNames = [];
    for (var i = 0; i < THEMES.length; i++) { themeNames.push(THEMES[i].label); }

    addDropdown(layer, 'Theme', themeNames, opts.theme);

    // Interaction triggers. Key these, or toggle them to hold a state.
    addCheckbox(layer, 'Press', false);
    addCheckbox(layer, 'Hover', false);
    addCheckbox(layer, 'Focus', false);

    // Geometry, in CSS pixels. Zoom multiplies all of it rather than scaling a
    // transform, so text and shapes both render at full comp resolution.
    addSlider(layer, 'Zoom', opts.zoom);
    addSlider(layer, 'Font Size', opts.fontSize);
    addSlider(layer, 'Tracking', 10);
    // 9 and 19, not 10 and 20: the border adds a pixel per side, and the CSS
    // drops the padding by exactly that to hold the outer size.
    addSlider(layer, 'Padding X', 19);
    addSlider(layer, 'Padding Y', 9);
    addSlider(layer, 'Corner Radius', 6);
    addSlider(layer, 'Border Width', 1);
    // Line box height as a multiple of font size. IBM Plex Mono at normal
    // line-height lands near 1.3.
    addSlider(layer, 'Line Factor', 1.3);
    addSlider(layer, 'Baseline Nudge', 0);
    addSlider(layer, 'Focus Ring Width', 2);
    addSlider(layer, 'Focus Ring Offset', 2);
    addCheckbox(layer, 'Show Plate', true);
  }

  function buildTokenControls(layer) {
    var p = PRESETS[0];

    addSlider(layer, 'Duration Fast (ms)', p.dur[0]);
    addSlider(layer, 'Duration Base (ms)', p.dur[1]);
    addSlider(layer, 'Duration Slow (ms)', p.dur[2]);
    addSlider(layer, 'Duration Slower (ms)', p.dur[3]);
    addSlider(layer, 'Delay Short (ms)', p.delay[0]);
    addSlider(layer, 'Delay Medium (ms)', p.delay[1]);
    addSlider(layer, 'Delay Long (ms)', p.delay[2]);

    addSlider(layer, 'Scale Press Subtle', p.scale[0]);
    addSlider(layer, 'Scale Press Base', p.scale[1]);
    addSlider(layer, 'Scale Press Expressive', p.scale[2]);
    addSlider(layer, 'Scale Lift', p.scale[3]);

    // Bezier handles, unitless. Not pixels, despite the control type: a point
    // control is the only two-number control AE offers, and a curve handle is
    // two numbers. Y is free to pass 1, which is what overshoot does.
    addPoint(layer, 'Ease Standard P1', p.easeStd[0]);
    addPoint(layer, 'Ease Standard P2', p.easeStd[1]);
    addPoint(layer, 'Ease Overshoot P1', p.easeOvr[0]);
    addPoint(layer, 'Ease Overshoot P2', p.easeOvr[1]);

    // Which token drives which part of the interaction. The component uses
    // duration.fast for both halves of the press and scale.pressBase for the
    // target, so those are the defaults.
    var durNames = ['Fast', 'Base', 'Slow', 'Slower'];
    addDropdown(layer, 'Press Duration Token', durNames, 1);
    addDropdown(layer, 'Release Duration Token', durNames, 1);
    addDropdown(layer, 'Press Delay Token', ['None', 'Short', 'Medium', 'Long'], 1);
    addDropdown(layer, 'Press Scale Token',
      ['Press Subtle', 'Press Base', 'Press Expressive', 'Lift'], 2);

    // The one control that has no counterpart in the app. In Cadence the
    // duration scalar has no shipped consumer, only the visualizer reads it.
    // Here it is a global retime for shooting the same gesture at a readable
    // speed. Named so nobody mistakes it for a token the component honors.
    addSlider(layer, 'Retime Scalar (video only)', 1);

    // Spring values ride along unused by the bezier rig. They are here so the
    // token layer is a complete Cadence token document rather than a subset,
    // and so a spring variant has somewhere to read from.
    addSlider(layer, 'Spring Stiffness (unused)', PRESETS[0].spring[0]);
    addSlider(layer, 'Spring Damping (unused)', PRESETS[0].spring[1]);
    addSlider(layer, 'Spring Mass (unused)', PRESETS[0].spring[2]);
  }

  function setExpr(prop, src) {
    prop.expression = src;
  }

  function shapeGroup(layer) {
    return layer.property('ADBE Root Vectors Group').property(1).property('ADBE Vectors Group');
  }

  function wireExpressions(comp, face, label, ring, plate) {
    var fg = shapeGroup(face);
    var fRect = byMatch(fg, 'ADBE Vector Shape - Rect');
    setExpr(fRect.property('ADBE Vector Rect Size'), exprFaceSize());
    setExpr(fRect.property('ADBE Vector Rect Roundness'), exprFaceRoundness());
    setExpr(byMatch(fg, 'ADBE Vector Graphic - Fill').property('ADBE Vector Fill Color'),
            exprFaceFill());
    var fStroke = byMatch(fg, 'ADBE Vector Graphic - Stroke');
    setExpr(fStroke.property('ADBE Vector Stroke Color'), exprFaceStrokeColor());
    setExpr(fStroke.property('ADBE Vector Stroke Width'), exprFaceStrokeWidth());
    setExpr(face.property('ADBE Transform Group').property('ADBE Scale'), exprFaceScale());

    setExpr(label.property('ADBE Text Properties').property('ADBE Text Document'),
            exprLabelSource());
    setExpr(label.property('ADBE Transform Group').property('ADBE Anchor Point'),
            exprLabelAnchor());
    setExpr(label.property('ADBE Transform Group').property('ADBE Position'),
            exprLabelPosition());

    var rg = shapeGroup(ring);
    var rRect = byMatch(rg, 'ADBE Vector Shape - Rect');
    setExpr(rRect.property('ADBE Vector Rect Size'), exprRingSize());
    setExpr(rRect.property('ADBE Vector Rect Roundness'), exprRingRoundness());
    var rStroke = byMatch(rg, 'ADBE Vector Graphic - Stroke');
    setExpr(rStroke.property('ADBE Vector Stroke Color'), exprRingColor());
    setExpr(rStroke.property('ADBE Vector Stroke Width'), exprRingWidth());
    setExpr(ring.property('ADBE Transform Group').property('ADBE Opacity'), exprRingOpacity());

    var pg = shapeGroup(plate);
    setExpr(byMatch(pg, 'ADBE Vector Shape - Rect').property('ADBE Vector Rect Size'),
            exprPlateSize());
    setExpr(byMatch(pg, 'ADBE Vector Graphic - Fill').property('ADBE Vector Fill Color'),
            exprPlateColor());
    setExpr(plate.property('ADBE Transform Group').property('ADBE Opacity'), exprPlateOpacity());
  }

  // ---------------------------------------------------------------------------
  // Operations on an existing rig
  // ---------------------------------------------------------------------------

  function applyText(str) {
    var rig = getRig();
    if (!rig || !rig.label) { return; }
    app.beginUndoGroup('Cadence Button: set label');
    var srcProp = rig.label.property('ADBE Text Properties').property('ADBE Text Document');
    var td = srcProp.value;
    td.text = str;
    // setValue on a property that carries an expression writes the underlying
    // value, which is exactly what the style expression reads back as `value`.
    srcProp.setValue(td);
    app.endUndoGroup();
  }

  function applyTheme(index) {
    var rig = getRig();
    if (!rig) { return; }
    app.beginUndoGroup('Cadence Button: set theme');
    var p = ctrlProp(rig.ctrl, 'Theme');
    if (p) { p.setValue(index); }
    rig.comp.bgColor = hexToFloats(THEMES[index - 1].bg);
    app.endUndoGroup();
  }

  function applyPreset(index) {
    var rig = getRig();
    if (!rig) { return; }
    var p = PRESETS[index];
    app.beginUndoGroup('Cadence Button: apply ' + p.label);
    var set = function (name, v) {
      var prop = ctrlProp(rig.tok, name);
      if (prop) { prop.setValue(v); }
    };
    set('Duration Fast (ms)', p.dur[0]);
    set('Duration Base (ms)', p.dur[1]);
    set('Duration Slow (ms)', p.dur[2]);
    set('Duration Slower (ms)', p.dur[3]);
    set('Delay Short (ms)', p.delay[0]);
    set('Delay Medium (ms)', p.delay[1]);
    set('Delay Long (ms)', p.delay[2]);
    set('Scale Press Subtle', p.scale[0]);
    set('Scale Press Base', p.scale[1]);
    set('Scale Press Expressive', p.scale[2]);
    set('Scale Lift', p.scale[3]);
    set('Ease Standard P1', p.easeStd[0]);
    set('Ease Standard P2', p.easeStd[1]);
    set('Ease Overshoot P1', p.easeOvr[0]);
    set('Ease Overshoot P2', p.easeOvr[1]);
    set('Spring Stiffness (unused)', p.spring[0]);
    set('Spring Damping (unused)', p.spring[1]);
    set('Spring Mass (unused)', p.spring[2]);
    app.endUndoGroup();
  }

  // Writes the two hold keyframes that a press is: on at the playhead, off
  // after the hold. Everything downstream is read from these two times.
  function keyToggle(which, holdSec) {
    var rig = getRig();
    if (!rig) { return; }
    var prop = ctrlProp(rig.ctrl, which);
    if (!prop) { return; }
    app.beginUndoGroup('Cadence Button: key ' + which);
    var t = rig.comp.time;
    if (prop.numKeys === 0 && t > 0) { prop.setValueAtTime(0, 0); }
    prop.setValueAtTime(t, 1);
    prop.setValueAtTime(t + holdSec, 0);
    app.endUndoGroup();
  }

  function clearToggle(which) {
    var rig = getRig();
    if (!rig) { return; }
    var prop = ctrlProp(rig.ctrl, which);
    if (!prop) { return; }
    app.beginUndoGroup('Cadence Button: clear ' + which);
    while (prop.numKeys > 0) { prop.removeKey(1); }
    prop.setValue(0);
    app.endUndoGroup();
  }

  // ---------------------------------------------------------------------------
  // Panel
  // ---------------------------------------------------------------------------

  function buildUI(thisObj) {
    var pal = (thisObj instanceof Panel)
      ? thisObj
      : new Window('palette', 'Cadence Button Rig', undefined, { resizeable: true });

    pal.orientation = 'column';
    pal.alignChildren = ['fill', 'top'];
    pal.spacing = 8;
    pal.margins = 12;

    var themeNames = [];
    var i;
    for (i = 0; i < THEMES.length; i++) { themeNames.push(THEMES[i].label); }

    // --- Build ---------------------------------------------------------------
    var gBuild = pal.add('panel', undefined, 'Build');
    gBuild.orientation = 'column';
    gBuild.alignChildren = ['fill', 'top'];
    gBuild.margins = 10;
    gBuild.spacing = 6;

    var r1 = gBuild.add('group');
    r1.add('statictext', undefined, 'Comp');
    var fW = r1.add('edittext', undefined, '1920');
    fW.characters = 5;
    r1.add('statictext', undefined, 'x');
    var fH = r1.add('edittext', undefined, '1080');
    fH.characters = 5;
    r1.add('statictext', undefined, 'fps');
    var fFps = r1.add('edittext', undefined, '60');
    fFps.characters = 4;

    var r2 = gBuild.add('group');
    r2.add('statictext', undefined, 'Seconds');
    var fDur = r2.add('edittext', undefined, '10');
    fDur.characters = 5;
    r2.add('statictext', undefined, 'Zoom');
    var fZoom = r2.add('edittext', undefined, '4');
    fZoom.characters = 4;
    r2.add('statictext', undefined, 'Font px');
    var fFont = r2.add('edittext', undefined, '14');
    fFont.characters = 4;

    var r3 = gBuild.add('group');
    r3.alignChildren = ['fill', 'center'];
    r3.add('statictext', undefined, 'Label');
    var fText = r3.add('edittext', undefined, 'Press me');
    fText.characters = 18;

    var r4 = gBuild.add('group');
    r4.add('statictext', undefined, 'Theme');
    var dTheme = r4.add('dropdownlist', undefined, themeNames);
    dTheme.selection = 0;

    var bBuild = gBuild.add('button', undefined, 'Build rig');

    // --- Edit ----------------------------------------------------------------
    var gEdit = pal.add('panel', undefined, 'Active rig');
    gEdit.orientation = 'column';
    gEdit.alignChildren = ['fill', 'top'];
    gEdit.margins = 10;
    gEdit.spacing = 6;

    var e1 = gEdit.add('group');
    e1.alignChildren = ['fill', 'center'];
    e1.add('statictext', undefined, 'Label');
    var fText2 = e1.add('edittext', undefined, 'Press me');
    fText2.characters = 14;
    var bText = e1.add('button', undefined, 'Set');
    bText.preferredSize.width = 44;

    var e2 = gEdit.add('group');
    e2.add('statictext', undefined, 'Theme');
    var dTheme2 = e2.add('dropdownlist', undefined, themeNames);
    dTheme2.selection = 0;
    var bTheme = e2.add('button', undefined, 'Set');
    bTheme.preferredSize.width = 44;

    var e3 = gEdit.add('group');
    e3.add('statictext', undefined, 'Preset');
    var bStd = e3.add('button', undefined, 'Standard');
    var bSnap = e3.add('button', undefined, 'Snappy');
    var bCine = e3.add('button', undefined, 'Cinematic');

    // --- Trigger -------------------------------------------------------------
    var gTrig = pal.add('panel', undefined, 'Trigger');
    gTrig.orientation = 'column';
    gTrig.alignChildren = ['fill', 'top'];
    gTrig.margins = 10;
    gTrig.spacing = 6;

    var t1 = gTrig.add('group');
    t1.add('statictext', undefined, 'State');
    var dWhich = t1.add('dropdownlist', undefined, ['Press', 'Hover', 'Focus']);
    dWhich.selection = 0;
    t1.add('statictext', undefined, 'Hold s');
    var fHold = t1.add('edittext', undefined, '0.12');
    fHold.characters = 5;

    var t2 = gTrig.add('group');
    t2.alignChildren = ['fill', 'center'];
    var bKey = t2.add('button', undefined, 'Key at playhead');
    var bClear = t2.add('button', undefined, 'Clear');

    var note = gTrig.add('statictext', undefined,
      'Keys are hold keys. The rig reads the last press and release before the current frame.',
      { multiline: true });
    note.preferredSize.height = 30;

    // --- Handlers ------------------------------------------------------------
    bBuild.onClick = function () {
      var opts = {
        name: 'Cadence Button',
        width: parseInt(fW.text, 10) || 1920,
        height: parseInt(fH.text, 10) || 1080,
        fps: parseFloat(fFps.text) || 60,
        duration: parseFloat(fDur.text) || 10,
        zoom: parseFloat(fZoom.text) || 4,
        fontSize: parseFloat(fFont.text) || 14,
        text: fText.text.length ? fText.text : 'Press me',
        theme: dTheme.selection.index + 1
      };
      buildRig(opts);
      fText2.text = opts.text;
      dTheme2.selection = dTheme.selection.index;
    };

    bText.onClick = function () { applyText(fText2.text); };
    bTheme.onClick = function () { applyTheme(dTheme2.selection.index + 1); };
    bStd.onClick = function () { applyPreset(0); };
    bSnap.onClick = function () { applyPreset(1); };
    bCine.onClick = function () { applyPreset(2); };
    bKey.onClick = function () {
      keyToggle(dWhich.selection.text, parseFloat(fHold.text) || 0.12);
    };
    bClear.onClick = function () { clearToggle(dWhich.selection.text); };

    pal.layout.layout(true);
    pal.layout.resize();
    pal.onResizing = pal.onResize = function () { this.layout.resize(); };

    if (pal instanceof Window) {
      pal.center();
      pal.show();
    }
    return pal;
  }

  buildUI(thisObj);

})(this);

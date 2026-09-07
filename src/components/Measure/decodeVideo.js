// Decoding a screen recording into frames, in the browser, with no library.
//
// A hidden <video> plays the file and each presented frame is drawn to a
// canvas and handed to the caller as ImageData with its media time. Two
// paths, chosen at runtime:
//
//   1. requestVideoFrameCallback (Chrome, Safari 15.4+, Firefox 132+): fires
//      once per PRESENTED frame with metadata.mediaTime, the frame's own
//      timestamp in the file. This is the accurate path: the timestamps are
//      the encoder's, not the wall clock's.
//   2. Seek-and-draw fallback: step currentTime by a fixed interval and draw
//      after each `seeked`. Every frame is visited, but the interval is a
//      guess at the file's frame rate, so timing is only as good as the guess.
//      Reported as such in the result (`timing: 'seeked'`).
//
// Why frames are not kept: a 1280x800 frame is 4 MB of ImageData, and a
// two-second recording is a hundred of them. The caller receives one frame at
// a time and keeps what it needs (the previous frame, a change mask, a crop).
// The recording itself never leaves the page: no fetch, no worker, no upload.

export function supportsVideoFrameCallback() {
  return typeof HTMLVideoElement !== 'undefined'
    && 'requestVideoFrameCallback' in HTMLVideoElement.prototype
}

// Decodes `file` (a File or Blob) and calls onFrame({ data, width, height,
// time }) for each frame, in order. Resolves with { width, height, frames,
// timing } when the video ends. `seekStep` is the fallback interval in
// seconds when frame callbacks are unavailable.
export async function decodeVideoFrames(file, onFrame, { seekStep = 1 / 60, playbackRate = 0.25 } = {}) {
  const url = URL.createObjectURL(file)
  const video = document.createElement('video')
  video.muted = true
  video.playsInline = true
  video.preload = 'auto'
  video.src = url
  try {
    await once(video, 'loadedmetadata', 'error')
    const width = video.videoWidth, height = video.videoHeight
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    // willReadFrequently keeps the canvas on the CPU path: getImageData every
    // frame from a GPU-backed canvas is a readback per frame.
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    const grab = time => {
      ctx.drawImage(video, 0, 0)
      onFrame({ data: ctx.getImageData(0, 0, width, height).data, width, height, time })
    }

    let frames = 0
    if (supportsVideoFrameCallback()) {
      // Presented frames only: at real-time speed the presenter skips frames
      // it cannot paint in time (a 1280x800 VP9 recording lost one frame in
      // five in the session-one round trip). Quarter speed gives it the time,
      // and mediaTime is the file's clock, so nothing about the timing
      // changes. What was still dropped is reported, not hidden.
      video.playbackRate = playbackRate
      await new Promise((resolve, reject) => {
        const tick = (_now, meta) => {
          grab(meta.mediaTime)
          frames++
          if (!video.ended) video.requestVideoFrameCallback(tick)
        }
        video.requestVideoFrameCallback(tick)
        video.addEventListener('ended', () => resolve(), { once: true })
        video.addEventListener('error', () => reject(video.error), { once: true })
        video.play().catch(reject)
      })
      const quality = video.getVideoPlaybackQuality?.()
      return {
        width, height, frames, timing: 'presented',
        decoded: quality?.totalVideoFrames ?? null,
        dropped: quality?.droppedVideoFrames ?? null,
      }
    }

    // Fallback: seek through the file at a fixed step.
    for (let t = 0; t <= video.duration; t += seekStep) {
      video.currentTime = t
      await once(video, 'seeked', 'error')
      grab(video.currentTime)
      frames++
    }
    return { width, height, frames, timing: 'seeked' }
  } finally {
    video.removeAttribute('src')
    video.load()
    URL.revokeObjectURL(url)
  }
}

function once(el, okEvent, errEvent) {
  return new Promise((resolve, reject) => {
    el.addEventListener(okEvent, resolve, { once: true })
    el.addEventListener(errEvent, () => reject(el.error ?? new Error(errEvent)), { once: true })
  })
}

// The two-pass trace over a recording, the browser twin of the spike's
// trace.mjs. Pass one finds where anything moved (the region of interest);
// pass two measures energy inside it. Decoding twice is cheaper than holding
// every frame. A caller-supplied `region` skips pass one (the manual
// override the page offers).
import { meanAbsDiff, accumulateChanged, changedBounds, dominantRegion } from './measureModel'

export async function traceRecording(file, { region: given, onProgress } = {}) {
  let region = given
  let meta
  const regionDebug = []
  if (!region) {
    let prev = null, mask = null
    meta = await decodeVideoFrames(file, ({ data, width, height, time }) => {
      if (!mask) mask = new Uint8Array(width * height)
      if (prev) {
        // Session-one diagnostics: which frames grew the mask, and where.
        const before = mask.reduce((a, b) => a + b, 0)
        accumulateChanged(mask, prev, data)
        const after = mask.reduce((a, b) => a + b, 0)
        if (after > before) regionDebug.push({ time: +time.toFixed(3), grew: after - before, box: changedBounds(mask, width, height, 0) })
      }
      prev = data
      onProgress?.('region')
    })
    region = mask ? dominantRegion(mask, meta.width, meta.height) : null
    if (!region) return { region: null, t: [], e: [], meta, regionDebug }
  }
  let prev = null
  const t = [], e = []
  meta = await decodeVideoFrames(file, ({ data, width, time }) => {
    if (prev) {
      t.push(time)
      e.push(meanAbsDiff(prev, data, width, region))
    }
    prev = data
    onProgress?.('trace')
  })
  return { region, t, e, meta, regionDebug }
}

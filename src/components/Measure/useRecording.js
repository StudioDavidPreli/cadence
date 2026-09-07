// The page's state machine: a file in, a measurement out.
//
// Owns the recording (a File and the object URL the preview video plays), the
// pipeline status, and the analysis. Everything heavy is in decodeVideo.js
// and measureModel.js; this hook only sequences them and keeps React informed.
// The recording never leaves the page: the only network request this hook can
// make is fetching one of the site's own samples, and that is a stored trace,
// not a video (see measureSample).

import { useCallback, useEffect, useRef, useState } from 'react'
import { traceRecording } from './decodeVideo'
import { analyzeTrace } from './measureModel'

export const STATUS = {
  IDLE: 'idle',
  DECODING: 'decoding',   // pass one: finding the region
  MEASURING: 'measuring', // pass two: the trace inside it
  DONE: 'done',
  EMPTY: 'empty',         // decoded fine, nothing moved
  ERROR: 'error',
}

// The browser's media errors are terse ("Media failed to decode") and name
// no cause. A refused format is the common one: Safari plays H.264 (.mov,
// .mp4) and not every WebM; Chrome and Firefox play WebM. Say that, plainly,
// and keep the browser's own text after it for anyone debugging.
function describeError(err) {
  const text = err?.message ?? String(err)
  const isMediaError = typeof MediaError !== 'undefined' && err instanceof MediaError
  if (isMediaError || /decode|MEDIA_ERR|not supported|no supported source/i.test(text)) {
    return `This browser could not play that file format. Safari plays .mov and .mp4; WebM plays in Chrome and Firefox. (${text})`
  }
  return text
}

export function useRecording() {
  const [file, setFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [status, setStatus] = useState(STATUS.IDLE)
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)
  // A run id so a slow decode that finishes after the user dropped a second
  // file cannot overwrite the second file's result.
  const runRef = useRef(0)

  // The preview's object URL lives as long as the file does.
  useEffect(() => {
    if (!file) { setPreviewUrl(null); return undefined }
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  const measure = useCallback(async (nextFile, { region } = {}) => {
    const run = ++runRef.current
    setFile(nextFile)
    setResult(null)
    setError(null)
    setStatus(STATUS.DECODING)
    try {
      const { region: found, t, e, meta } = await traceRecording(nextFile, {
        region,
        onProgress: stage => {
          if (runRef.current !== run) return
          setStatus(stage === 'trace' ? STATUS.MEASURING : STATUS.DECODING)
        },
      })
      if (runRef.current !== run) return
      if (!found) { setStatus(STATUS.EMPTY); return }
      const analysis = analyzeTrace(t, e)
      setResult({ region: found, meta, t, e, ...analysis })
      setStatus(STATUS.DONE)
    } catch (err) {
      if (runRef.current !== run) return
      setError(describeError(err))
      setStatus(STATUS.ERROR)
    }
  }, [])

  // One of the site's own samples: a trace recorded once from the built
  // site's Button with known tokens live (David's call, 2026-09-07). The
  // recording was decoded then; what ships is its pixel-change trace, the
  // measured region, the truth, and one still, so the sample opens in every
  // browser with no codec in the way and no decoding to redo. The fit is the
  // part that runs now, through the same analyzeTrace a dropped file gets, so
  // a change to the model changes the samples with it and nothing stored can
  // go stale. The fetch is the sample's JSON; a user's recording is never
  // fetched or sent anywhere.
  const measureSample = useCallback(async sample => {
    const run = ++runRef.current
    setFile(null)
    setResult(null)
    setError(null)
    setStatus(STATUS.MEASURING)
    try {
      const res = await fetch(sample.data)
      if (!res.ok) throw new Error(`Could not load the sample (${res.status}).`)
      const doc = await res.json()
      if (runRef.current !== run) return
      const analysis = analyzeTrace(doc.t, doc.e)
      setResult({
        sample: doc,
        region: doc.region,
        meta: { frames: doc.t.length + 1, timing: 'trace', decoded: null, dropped: 0 },
        t: doc.t,
        e: doc.e,
        ...analysis,
      })
      setStatus(STATUS.DONE)
    } catch (err) {
      if (runRef.current !== run) return
      setError(describeError(err))
      setStatus(STATUS.ERROR)
    }
  }, [])

  const reset = useCallback(() => {
    runRef.current++
    setFile(null)
    setResult(null)
    setError(null)
    setStatus(STATUS.IDLE)
  }, [])

  return { file, previewUrl, status, error, result, measure, measureSample, reset }
}

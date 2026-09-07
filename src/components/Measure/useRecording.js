// The page's state machine: a file in, a measurement out.
//
// Owns the recording (a File and the object URL the preview video plays), the
// pipeline status, and the analysis. Everything heavy is in decodeVideo.js
// and measureModel.js; this hook only sequences them and keeps React informed.
// The recording never leaves the page: the only network request this hook can
// make is fetching one of the site's own sample recordings, and that is
// separate from measuring.

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
      setError(err?.message ?? String(err))
      setStatus(STATUS.ERROR)
    }
  }, [])

  // One of the site's own recordings, fetched from this origin. The fetch is
  // the sample, not the user's file; a user's recording is never fetched or
  // sent anywhere.
  const measureSample = useCallback(async sample => {
    setStatus(STATUS.DECODING)
    setError(null)
    try {
      const res = await fetch(sample.file)
      if (!res.ok) throw new Error(`Could not load the sample (${res.status}).`)
      const blob = await res.blob()
      await measure(new File([blob], sample.file.split('/').pop(), { type: blob.type || 'video/webm' }))
    } catch (err) {
      setError(err?.message ?? String(err))
      setStatus(STATUS.ERROR)
    }
  }, [measure])

  const reset = useCallback(() => {
    runRef.current++
    setFile(null)
    setResult(null)
    setError(null)
    setStatus(STATUS.IDLE)
  }, [])

  return { file, previewUrl, status, error, result, measure, measureSample, reset }
}

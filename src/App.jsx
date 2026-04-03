import { useState, useEffect, useRef } from 'react'
import PuzzleCard from './PuzzleCard'

function App() {
  const [clips, setClips] = useState([])
  const [allClips, setAllClips] = useState([])
  const [skaters, setSkaters] = useState([])
  const [competitions, setCompetitions] = useState([])
  const [totalScore, setTotalScore] = useState(0)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [mode, setMode] = useState('Daily')
  const [puzzleStates, setPuzzleStates] = useState({})
  const [showWelcome, setShowWelcome] = useState(true)
  const puzzleStatesRef = useRef({})

  // Endless state
  const [endlessHistory, setEndlessHistory] = useState([])
  const [endlessHistoryIndex, setEndlessHistoryIndex] = useState(0)
  const [usedEndlessIds, setUsedEndlessIds] = useState([])

  // Sets state
  const [showSetsPopup, setShowSetsPopup] = useState(false)
  const [setsAccordion, setSetsAccordion] = useState(null)
  const [selectedSet, setSelectedSet] = useState(null)
  const [setsClips, setSetsClips] = useState([])
  const [setsIndex, setSetsIndex] = useState(0)

  // VS Mode state
  const [vsMode, setVsMode] = useState(false)
  const [vsSkater1, setVsSkater1] = useState(null)
  const [vsSkater2, setVsSkater2] = useState(null)
  const [vsResults, setVsResults] = useState([])

  useEffect(() => {
    puzzleStatesRef.current = puzzleStates
  }, [puzzleStates])

  useEffect(() => {
    fetch('http://localhost:8080/api/skaters')
      .then(res => res.json())
      .then(data => setSkaters(data))

    fetch('http://localhost:8080/api/daily')
      .then(res => res.json())
      .then(data => setClips(data))

    fetch('http://localhost:8080/api/clips/season')
      .then(res => res.json())
      .then(data => setAllClips(data))

    fetch('http://localhost:8080/api/clips/competitions')
      .then(res => res.json())
      .then(data => setCompetitions(data))
  }, [])

  const getPuzzleState = (clipId) => puzzleStates[clipId] || {
    wrongGuesses: [],
    solved: false,
    failed: false,
    points: 0,
    skipped: false,
    celebrating: false
  }

  const addEndlessClip = (excludeId = null) => {
    let currentUsed = usedEndlessIds
    let available = allClips.filter(c => c.id !== excludeId && !currentUsed.includes(c.id))
    if (available.length === 0) {
      currentUsed = []
      setUsedEndlessIds([])
      available = allClips.filter(c => c.id !== excludeId)
    }
    const next = available[Math.floor(Math.random() * available.length)]
    if (next) {
      setUsedEndlessIds(prev => [...prev, next.id])
      return next
    }
    return null
  }

  const handleModeChange = (newMode) => {
    setMode(newMode)
    setTotalScore(0)
    setPuzzleStates({})
    setVsMode(false)
    setVsResults([])
    if (newMode === 'Endless') {
      const first = allClips[Math.floor(Math.random() * allClips.length)]
      if (first) {
        setEndlessHistory([first])
        setEndlessHistoryIndex(0)
        setUsedEndlessIds([first.id])
      }
    } else if (newMode === 'Daily') {
      setCurrentIndex(0)
    } else if (newMode === 'Sets') {
      setShowSetsPopup(true)
      setSelectedSet(null)
      setSetsClips([])
      setSetsAccordion(null)
      setVsSkater1(null)
      setVsSkater2(null)
    }
  }

  const getRandomSetClips = (competition) => {
    fetch(`http://localhost:8080/api/clips/competition/${competition}`)
      .then(res => res.json())
      .then(data => {
        const shuffled = [...data].sort(() => Math.random() - 0.5)
        setSetsClips(shuffled.slice(0, 6))
        setSetsIndex(0)
      })
  }

  const getVsClips = () => {
    const skater1Clips = allClips.filter(c => c.skater.id === vsSkater1.id)
    const skater2Clips = allClips.filter(c => c.skater.id === vsSkater2.id)
    const s1 = [...skater1Clips].sort(() => Math.random() - 0.5).slice(0, 3)
    const s2 = [...skater2Clips].sort(() => Math.random() - 0.5).slice(0, 3)
    const combined = [...s1, ...s2].sort(() => Math.random() - 0.5)
    setSetsClips(combined)
    setSetsIndex(0)
    setVsResults([])
  }

  const handleStartSet = () => {
    if (vsMode) {
      if (!vsSkater1 || !vsSkater2) return
      setShowSetsPopup(false)
      getVsClips()
      setTotalScore(0)
      setPuzzleStates({})
    } else {
      if (!selectedSet) return
      setShowSetsPopup(false)
      getRandomSetClips(selectedSet)
      setTotalScore(0)
      setPuzzleStates({})
      setSetsIndex(0)
    }
  }

  const goToNext = (currentClipId) => {
    const current = puzzleStatesRef.current
    const currentClipIndex = clips.findIndex(c => c.id === currentClipId)
    let i = (currentClipIndex + 1) % clips.length
    let count = 0
    while (count < clips.length) {
      const state = current[clips[i]?.id] || {}
      if (!state.solved && !state.failed && clips[i]?.id !== currentClipId) break
      i = (i + 1) % clips.length
      count++
    }
    if (count < clips.length) setCurrentIndex(i)
  }

  const goToNextSets = (currentClipId) => {
    const current = puzzleStatesRef.current
    const currentClipIndex = setsClips.findIndex(c => c.id === currentClipId)
    let i = (currentClipIndex + 1) % setsClips.length
    let count = 0
    while (count < setsClips.length) {
      const state = current[setsClips[i]?.id] || {}
      if (!state.solved && !state.failed && setsClips[i]?.id !== currentClipId) break
      i = (i + 1) % setsClips.length
      count++
    }
    if (count < setsClips.length) setSetsIndex(i)
  }

  const handleCorrect = (clipId, points) => {
    setTotalScore(prev => prev + points)
    setPuzzleStates(prev => ({
      ...prev,
      [clipId]: { ...(prev[clipId] || {}), solved: true, points, celebrating: true }
    }))
    if (vsMode) {
      setVsResults(prev => [...prev, { clipId, correct: true }])
    }
    setTimeout(() => {
      setPuzzleStates(prev => ({
        ...prev,
        [clipId]: { ...prev[clipId], celebrating: false }
      }))
      if (mode === 'Endless') {
        const newClip = addEndlessClip(clipId)
        if (newClip) {
          setEndlessHistory(prev => {
            const newHistory = [...prev.slice(0, endlessHistoryIndex + 1), newClip]
            setEndlessHistoryIndex(newHistory.length - 1)
            return newHistory
          })
        }
      } else if (mode === 'Sets') {
        goToNextSets(clipId)
      } else {
        goToNext(clipId)
      }
    }, 1800)
  }

  const handleFailed = (clipId) => {
    setPuzzleStates(prev => ({
      ...prev,
      [clipId]: { ...(prev[clipId] || {}), failed: true }
    }))
    setTimeout(() => {
      if (mode === 'Endless') {
        const newClip = addEndlessClip(clipId)
        if (newClip) {
          setEndlessHistory(prev => {
            const newHistory = [...prev.slice(0, endlessHistoryIndex + 1), newClip]
            setEndlessHistoryIndex(newHistory.length - 1)
            return newHistory
          })
        }
      } else if (mode === 'Sets') {
        goToNextSets(clipId)
      } else {
        goToNext(clipId)
      }
    }, 1800)
  }

  const handleSkip = (clipId) => {
    setPuzzleStates(prev => ({
      ...prev,
      [clipId]: { ...(prev[clipId] || {}), skipped: true }
    }))
    if (mode === 'Endless') {
      const newClip = addEndlessClip(clipId)
      if (newClip) {
        setEndlessHistory(prev => {
          const newHistory = [...prev.slice(0, endlessHistoryIndex + 1), newClip]
          setEndlessHistoryIndex(newHistory.length - 1)
          return newHistory
        })
      }
    } else if (mode === 'Sets') {
      goToNextSets(clipId)
    } else {
      goToNext(clipId)
    }
  }

  const handleWrongGuess = (clipId, guess) => {
    if (vsMode) {
      setVsResults(prev => [...prev, { clipId, correct: false, guessed: guess }])
    }
    setPuzzleStates(prev => {
      const existing = prev[clipId] || { wrongGuesses: [] }
      return {
        ...prev,
        [clipId]: {
          ...existing,
          wrongGuesses: [...(existing.wrongGuesses || []), guess]
        }
      }
    })
  }

  const handleBack = () => {
    if (mode === 'Endless') {
      if (endlessHistoryIndex > 0) setEndlessHistoryIndex(prev => prev - 1)
    } else if (mode === 'Sets') {
      if (setsIndex > 0) setSetsIndex(prev => prev - 1)
    } else {
      if (currentIndex > 0) setCurrentIndex(prev => prev - 1)
    }
  }

  const generateShareText = () => {
    if (vsMode) {
      const s1Name = vsSkater1?.name || 'Skater 1'
      const s2Name = vsSkater2?.name || 'Skater 2'
      const s1Clips = setsClips.filter(c => c.skater.id === vsSkater1?.id)
      const s2Clips = setsClips.filter(c => c.skater.id === vsSkater2?.id)
      const confusion = vsResults.filter(r => !r.correct).length
      const s1Lines = s1Clips.map((c, i) => {
        const result = vsResults.find(r => r.clipId === c.id)
        return `  Clip ${i + 1} — ${result?.correct ? '✅' : '❌ confused'}`
      }).join('\n')
      const s2Lines = s2Clips.map((c, i) => {
        const result = vsResults.find(r => r.clipId === c.id)
        return `  Clip ${i + 1} — ${result?.correct ? '✅' : '❌ confused'}`
      }).join('\n')
      const text = `SkateGuess — ${s1Name} vs ${s2Name}\n━━━━━━━━━━━━\n${s1Name}:\n${s1Lines}\n\n${s2Name}:\n${s2Lines}\n━━━━━━━━━━━━\nYou confused them ${confusion} times!`
      navigator.clipboard.writeText(text)
      alert('Copied to clipboard!')
      return
    }
    const activeclips = mode === 'Sets' ? setsClips : clips
    const lines = activeclips.map((clip, index) => {
      const state = getPuzzleState(clip.id)
      const emojis = !state.solved && !state.failed ? '⬜⬜⬜'
        : state.points === 3 ? '🟢'
        : state.points === 2 ? '🔴🟢'
        : state.points === 1 ? '🔴🔴🟢'
        : '🔴🔴🔴'
      const pts = state.failed ? '0pts' : state.points === 1 ? '1pt ' : `${state.points}pts`
      return `P${index + 1}  ${pts}  ${emojis}`
    })
    const header = mode === 'Sets' ? `SkateGuess — ${selectedSet}`
      : mode === 'Endless' ? 'SkateGuess — Endless'
      : 'SkateGuess #1'
    const text = [header, '━━━━━━━━━━━━', ...lines, '━━━━━━━━━━━━', `Total  ${totalScore}/18`].join('\n')
    navigator.clipboard.writeText(text)
    alert('Copied to clipboard!')
  }

  const activeClips = mode === 'Sets' ? setsClips : clips
  const allDone = mode !== 'Endless' && activeClips.length > 0 && activeClips.every(c => {
    const state = getPuzzleState(c.id)
    return state.solved || state.failed
  })

  const vsAllDone = vsMode && setsClips.length > 0 && setsClips.every(c => {
    const state = getPuzzleState(c.id)
    return state.solved || state.failed || state.skipped
  })

  const currentClip = mode === 'Endless'
    ? endlessHistory[endlessHistoryIndex]
    : mode === 'Sets'
    ? setsClips[setsIndex]
    : clips[currentIndex]

  const currentPuzzleNumber = mode === 'Endless'
    ? endlessHistoryIndex + 1
    : mode === 'Sets'
    ? setsIndex + 1
    : currentIndex + 1

  const totalClips = mode === 'Endless' ? '∞' : activeClips.length
  const canGoBack = mode === 'Endless' ? endlessHistoryIndex > 0
    : mode === 'Sets' ? setsIndex > 0
    : currentIndex > 0

  return (
    <div className="app">
      <div className="bg" />
      <div className="aura1" />
      <div className="aura2" />
      <div className="aura3" />

      {showWelcome && (
        <div className="sets-overlay">
          <div className="sets-popup" style={{ maxWidth: '500px' }}>
            <div className="sets-popup-aura" />
            <div className="sets-header">
              <div className="sets-title">Welcome to Skate Guess 🛼</div>
              <div className="sets-subtitle">Test your figure skating knowledge</div>
            </div>
            <div style={{ padding: '16px 18px', position: 'relative', zIndex: 1 }}>
              <div style={{ marginBottom: '14px' }}>
                <div style={{ fontSize: '9px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#1a2a4a', fontFamily: 'Arial', fontWeight: 500, marginBottom: '8px' }}>How to play</div>
                <div style={{ fontSize: '12px', color: '#4a6080', fontFamily: 'Arial', lineHeight: '1.8' }}>
                  Watch a short clip of a skater from the waist down and guess who it is.<br />
                  • First guess — 3 points<br />
                  • Second guess — 2 points<br />
                  • Third guess — 1 point<br />
                  • Miss all three — 0 points
                </div>
              </div>
              <div style={{ marginBottom: '14px' }}>
                <div style={{ fontSize: '9px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#1a2a4a', fontFamily: 'Arial', fontWeight: 500, marginBottom: '8px' }}>Modes</div>
                <div style={{ fontSize: '12px', color: '#4a6080', fontFamily: 'Arial', lineHeight: '1.8' }}>
                  • <strong>Daily</strong> — 6 new puzzles every day, same for everyone<br />
                  • <strong>Endless</strong> — keep going as long as you want<br />
                  • <strong>Sets</strong> — pick a competition or test yourself in VS Mode, where you try to tell two skaters apart
                </div>
              </div>
              <div>
                <div style={{ fontSize: '9px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#1a2a4a', fontFamily: 'Arial', fontWeight: 500, marginBottom: '8px' }}>A note from the creator</div>
                <div style={{ fontSize: '12px', color: '#4a6080', fontFamily: 'Arial', lineHeight: '1.8' }}>
                  SkateGuess is a brand new project so the clip library is still small — most clips are from recent seasons. I'm actively working on adding more! If you're interested in helping, have suggestions, or spot any bugs, feel free to reach out on social media.
                </div>
              </div>
            </div>
            <div className="sets-footer">
              <button className="sets-start" onClick={() => setShowWelcome(false)}>Let's Play!</button>
            </div>
          </div>
        </div>
      )}

      {showSetsPopup && (
        <div className="sets-overlay">
          <div className="sets-popup">
            <div className="sets-popup-aura" />
            <div className="sets-header">
              <div className="sets-title">Choose a set</div>
              <div className="sets-subtitle">Select a mode to play</div>
            </div>
            <div className="accordion-item">
              <div className="accordion-header" onClick={() => {
                setSetsAccordion(setsAccordion === 'events' ? null : 'events')
                setVsMode(false)
                setVsSkater1(null)
                setVsSkater2(null)
              }}>
                <span className="accordion-title">Events</span>
                <span className="accordion-arrow">{setsAccordion === 'events' ? '▲' : '▼'}</span>
              </div>
              {setsAccordion === 'events' && (
                <div className="accordion-body">
                  {competitions.map(comp => (
                    <div
                      key={comp}
                      className={`set-item ${selectedSet === comp ? 'selected' : ''}`}
                      onClick={() => setSelectedSet(comp)}
                    >
                      <span className="set-name">{comp}</span>
                      <div className={`set-check ${selectedSet === comp ? 'checked' : ''}`}>
                        {selectedSet === comp ? '✓' : ''}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="accordion-item">
              <div className="accordion-header" onClick={() => {
                setSetsAccordion(setsAccordion === 'vs' ? null : 'vs')
                setVsMode(true)
                setSelectedSet(null)
              }}>
                <span className="accordion-title">VS Mode</span>
                <span className="accordion-arrow">{setsAccordion === 'vs' ? '▲' : '▼'}</span>
              </div>
              {setsAccordion === 'vs' && (
                <div className="accordion-body">
                  <div className="vs-picker">
                    <div className="vs-label">Skater 1</div>
                    <select className="vs-select" value={vsSkater1?.id || ''} onChange={e => {
                      const s = skaters.find(sk => sk.id === e.target.value)
                      setVsSkater1(s || null)
                    }}>
                      <option value="">Select a skater...</option>
                      {skaters.filter(s => s.id !== vsSkater2?.id).sort((a, b) => a.name.localeCompare(b.name)).map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="vs-vs">VS</div>
                  <div className="vs-picker">
                    <div className="vs-label">Skater 2</div>
                    <select className="vs-select" value={vsSkater2?.id || ''} onChange={e => {
                      const s = skaters.find(sk => sk.id === e.target.value)
                      setVsSkater2(s || null)
                    }}>
                      <option value="">Select a skater...</option>
                      {skaters.filter(s => s.id !== vsSkater1?.id).sort((a, b) => a.name.localeCompare(b.name)).map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>
            <div className="sets-footer">
              <button className="sets-cancel" onClick={() => {
                setShowSetsPopup(false)
                setMode('Daily')
              }}>Cancel</button>
              <button className="sets-start" onClick={handleStartSet}>Start</button>
            </div>
          </div>
        </div>
      )}

      <div className="content">
        <div className="header">
          <div className="mode-corner">
            <label>Mode:&nbsp;</label>
            <select value={mode} onChange={e => handleModeChange(e.target.value)}>
              <option>Daily</option>
              <option>Endless</option>
              <option>Sets</option>
            </select>
          </div>
          <div className="logo">Skate Guess</div>
          <div className="subtitle">Daily figure skating challenge</div>
        </div>

        {mode === 'Daily' && (
          <div className="puzzle-nav">
            {clips.map((clip, index) => {
              const state = puzzleStates[clip.id] || {}
              const dotClass = state.solved ? 'done-correct'
                : state.failed ? 'done-failed'
                : state.skipped ? 'skipped'
                : index === currentIndex ? 'active'
                : ''
              return (
                <div key={clip.id} className={`pdot ${dotClass}`} onClick={() => setCurrentIndex(index)}>
                  {index + 1}
                </div>
              )
            })}
          </div>
        )}

        {mode === 'Sets' && setsClips.length > 0 && (
          <div className="puzzle-nav">
            {setsClips.map((clip, index) => {
              const state = puzzleStates[clip.id] || {}
              const dotClass = state.solved ? 'done-correct'
                : state.failed ? 'done-failed'
                : state.skipped ? 'skipped'
                : index === setsIndex ? 'active'
                : ''
              return (
                <div key={clip.id} className={`pdot ${dotClass}`} onClick={() => setSetsIndex(index)}>
                  {index + 1}
                </div>
              )
            })}
          </div>
        )}

        {mode === 'Endless' && (
          <div className="counter-row">
            <span className="counter">{endlessHistoryIndex + 1} / ∞</span>
            <span className="counter-score">Score: {totalScore}</span>
          </div>
        )}

        <div className="main">
          {vsAllDone ? (
            <div className="all-done">
              <h2>{vsSkater1?.name} vs {vsSkater2?.name}</h2>
              <div className="vs-results">
                {[vsSkater1, vsSkater2].map(skater => {
                  const skaterClips = setsClips.filter(c => c.skater.id === skater.id)
                  return (
                    <div key={skater.id} className="vs-result-block">
                      <div className="vs-result-name">{skater.name}</div>
                      {skaterClips.map((c, i) => {
                        const state = getPuzzleState(c.id)
                        return (
                          <div key={c.id} className="vs-result-row">
                            Clip {i + 1} — {state.solved ? '✅' : state.skipped ? '⏭️' : '❌ confused'}
                          </div>
                        )
                      })}
                    </div>
                  )
                })}
              </div>
              <p style={{ marginTop: '12px', fontSize: '13px', color: '#4a6080', fontFamily: 'Arial' }}>
                You confused them {vsResults.filter(r => !r.correct).length} times!
              </p>
              <button className="share-btn" onClick={generateShareText} style={{ marginTop: '12px' }}>Share</button>
              <button className="share-btn" style={{ marginTop: '10px' }} onClick={() => {
                setTotalScore(0)
                setPuzzleStates({})
                setVsResults([])
                getVsClips()
              }}>Play again</button>
            </div>
          ) : allDone ? (
            <div className="all-done">
              <h2>All done!</h2>
              <p>Final score: {totalScore} / 18</p>
              <button className="share-btn" onClick={generateShareText}>Share your score</button>
              {mode === 'Sets' && !vsMode && (
                <button className="share-btn" style={{ marginTop: '10px' }} onClick={() => {
                  setTotalScore(0)
                  setPuzzleStates({})
                  getRandomSetClips(selectedSet)
                }}>Play again</button>
              )}
            </div>
          ) : currentClip ? (
            <PuzzleCard
              key={currentClip.id}
              clip={currentClip}
              puzzleNumber={currentPuzzleNumber}
              totalClips={totalClips}
              totalScore={totalScore}
              maxScore={mode === 'Endless' ? '∞' : vsMode ? '—' : 18}
              puzzleState={getPuzzleState(currentClip.id)}
              onCorrect={handleCorrect}
              onFailed={handleFailed}
              onWrongGuess={handleWrongGuess}
              onSkip={handleSkip}
              onBack={canGoBack ? handleBack : null}
              vsMode={vsMode}
              vsSkater1={vsSkater1}
              vsSkater2={vsSkater2}
            />
          ) : null}
        </div>
      </div>
    </div>
  )
}

export default App
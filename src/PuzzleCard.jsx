import { useState, useRef } from 'react'

function PuzzleCard({ clip, puzzleNumber, totalClips, totalScore, maxScore, puzzleState, onCorrect, onFailed, onWrongGuess, onSkip, onBack, vsMode, vsSkater1, vsSkater2 }) {
  const [guess, setGuess] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const inputRef = useRef(null)

  const { wrongGuesses = [], solved = false, failed = false, points = 0, celebrating = false } = puzzleState || {}
  const guessesLeft = 3 - wrongGuesses.length
  const isLocked = solved || failed || celebrating

  const getVsSuggestions = (val) => {
    const options = [vsSkater1, vsSkater2].filter(Boolean)
    return options.filter(s => s.name.toLowerCase().includes(val.toLowerCase()))
  }

  const handleInputChange = (e) => {
    const val = e.target.value
    setGuess(val)
    if (val.trim().length > 0) {
      if (vsMode) {
        setSuggestions(getVsSuggestions(val).map(s => ({ id: s.id, name: s.name })))
        setShowSuggestions(true)
      } else {
        fetch('https://skateguess-api-production.up.railway.app/api/skaters')
          .then(res => res.json())
          .then(data => {
            const filtered = data.filter(s => s.name.toLowerCase().includes(val.toLowerCase()))
            setSuggestions(filtered)
            setShowSuggestions(true)
          })
      }
    } else {
      setSuggestions([])
      setShowSuggestions(false)
    }
  }

  const handleSelectSuggestion = (name) => {
    setGuess(name)
    setSuggestions([])
    setShowSuggestions(false)
    inputRef.current?.focus()
  }

  const handleGuess = () => {
    if (!guess.trim() || isLocked) return
    setShowSuggestions(false)

    fetch('https://skateguess-api-production.up.railway.app/api/guess', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clipId: clip.id,
        skaterName: guess,
        guessNumber: wrongGuesses.length + 1
      })
    })
      .then(res => res.json())
      .then(data => {
        if (data.correct) {
          setGuess('')
          onCorrect(clip.id, data.points)
        } else {
          onWrongGuess(clip.id, guess)
          setGuess('')
          if (wrongGuesses.length + 1 >= 3) {
            onFailed(clip.id)
          }
        }
      })
  }

  return (
    <div className="card">
      <div className="card-aura1" />
      <div className="card-aura2" />

      <div className="card-top">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {onBack && (
            <button className="back-btn" onClick={onBack}>← Back</button>
          )}
          <span className="card-label">Puzzle {puzzleNumber} of {totalClips}</span>
        </div>
        <span className="card-guesses">{guessesLeft} guesses remaining</span>
      </div>

      <div className="score-row">
        <span className="score-label">Score</span>
        <span className="score-val">{totalScore} / {maxScore}</span>
      </div>

      <div className="video-area">
        <video
          src={clip.url}
          controls
          autoPlay
          loop
          style={{ width: '100%', height: 'auto', display: 'block', position: 'relative', zIndex: 2 }}
        />
      </div>

      <div className="divider" />

      <div className="guess-area">
        <div className="guess-label">
          {vsMode ? `Is this ${vsSkater1?.name} or ${vsSkater2?.name}?` : 'Who is this skater?'}
        </div>

        {celebrating && (
          <div className="celebration">
            Correct! +{points} {points === 1 ? 'point' : 'points'}
          </div>
        )}

        {!isLocked && (
          <div style={{ position: 'relative' }}>
            <div className="guess-row">
              <input
                ref={inputRef}
                className="guess-input"
                type="text"
                value={guess}
                onChange={handleInputChange}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleGuess()
                  if (e.key === 'Escape') setShowSuggestions(false)
                }}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                placeholder={vsMode ? `${vsSkater1?.name} or ${vsSkater2?.name}?` : 'Start typing a name...'}
                autoComplete="off"
              />
              <button className="guess-btn" onClick={handleGuess}>Guess</button>
              <button className="skip-btn" onClick={() => onSkip(clip.id)}>Skip</button>
            </div>

            {showSuggestions && suggestions.length > 0 && (
              <div className="suggestions">
                {suggestions.map(s => (
                  <div key={s.id} className="suggestion-item" onMouseDown={() => handleSelectSuggestion(s.name)}>
                    {s.name}
                  </div>
                ))}
              </div>
            )}

            {wrongGuesses.map((g, i) => (
              <div key={i} className="wrong-row">
                <span className="wrong-text">{g}</span>
              </div>
            ))}
          </div>
        )}

        {solved && !celebrating && (
          <div className="correct-msg">
            Correct! +{points} {points === 1 ? 'point' : 'points'}
          </div>
        )}

        {failed && (
          <div className="failed-msg">
            The answer was {clip.skater.name}
          </div>
        )}
      </div>
    </div>
  )
}

export default PuzzleCard
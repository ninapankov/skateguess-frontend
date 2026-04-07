import { useState, useEffect } from 'react'

function StatsPage({ onClose }) {
  const [availableDates, setAvailableDates] = useState([])
  const [selectedDate, setSelectedDate] = useState(null)
  const [statsData, setStatsData] = useState([])
  const [loading, setLoading] = useState(false)
  const completedDailies = JSON.parse(localStorage.getItem('completedDailies') || '[]')
  const today = new Date().toISOString().split('T')[0]
  const todayCompleted = completedDailies.includes(today)

  useEffect(() => {
    fetch('https://skateguess-api-production.up.railway.app/api/results/dates')
      .then(res => res.json())
      .then(data => setAvailableDates(data))
  }, [])

  const handleDateClick = (date) => {
    if (!canView(date)) return
    setSelectedDate(date)
    setLoading(true)
    fetch(`https://skateguess-api-production.up.railway.app/api/results/${date}`)
      .then(res => res.json())
      .then(data => {
        setStatsData(data)
        setLoading(false)
      })
  }

 const canView = (date) => {
    if (date === today) return todayCompleted
    return date < today
  }

  const formatDate = (dateStr) => {
    const d = new Date(dateStr + 'T00:00:00')
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const getDotColor = (date) => {
    if (date > today) return 'date-future'
    if (date === today) return todayCompleted ? 'date-today-done' : 'date-today-locked'
    return 'date-unlocked'
  }

  return (
    <div className="sets-overlay">
      <div className="stats-popup">
        <div className="sets-popup-aura" />
        <div className="stats-header">
          <div className="sets-title">Daily History</div>
          <button className="stats-close" onClick={onClose}>X</button>
        </div>

       

        <div className="stats-calendar">
          {availableDates.map(date => (
            <div
              key={date}
              className={`date-cell ${getDotColor(date)} ${selectedDate === date ? 'date-selected' : ''}`}
              onClick={() => handleDateClick(date)}
            >
              <div className="date-cell-day">{new Date(date + 'T00:00:00').getDate()}</div>
              <div className="date-cell-month">{new Date(date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short' })}</div>
            </div>
          ))}
        </div>

        {selectedDate && (
          <div className="stats-results">
            <div className="stats-date-title">{formatDate(selectedDate)}</div>
            {loading ? (
              <div className="stats-loading">Loading...</div>
            ) : (
              statsData.map((clip, i) => (
                <div key={clip.clipId} className="stats-clip">
                  <div className="stats-clip-header">
                    <span className="stats-clip-number">Puzzle {i + 1}</span>
                    <span className="stats-clip-skater">{clip.skaterName}</span>
                    <span className="stats-clip-total">{clip.total} players</span>
                  </div>
                  <video
                    src={clip.url}
                    style={{ width: '100%', height: 'auto', display: 'block', marginBottom: '8px' }}
                    controls
                    loop
                  />
                  <div className="stats-bars">
                    <div className="stats-bar-row">
                      <span className="stats-bar-label">1st try</span>
                      <div className="stats-bar-track">
                        <div className="stats-bar stats-bar-1" style={{ width: clip.first + '%' }} />
                      </div>
                      <span className="stats-bar-pct">{Math.round(clip.first)}%</span>
                    </div>
                    <div className="stats-bar-row">
                      <span className="stats-bar-label">2nd try</span>
                      <div className="stats-bar-track">
                        <div className="stats-bar stats-bar-2" style={{ width: clip.second + '%' }} />
                      </div>
                      <span className="stats-bar-pct">{Math.round(clip.second)}%</span>
                    </div>
                    <div className="stats-bar-row">
                      <span className="stats-bar-label">3rd try</span>
                      <div className="stats-bar-track">
                        <div className="stats-bar stats-bar-3" style={{ width: clip.third + '%' }} />
                      </div>
                      <span className="stats-bar-pct">{Math.round(clip.third)}%</span>
                    </div>
                    <div className="stats-bar-row">
                      <span className="stats-bar-label">Missed</span>
                      <div className="stats-bar-track">
                        <div className="stats-bar stats-bar-miss" style={{ width: clip.miss + '%' }} />
                      </div>
                      <span className="stats-bar-pct">{Math.round(clip.miss)}%</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        <div className="sets-footer">
          <button className="sets-start" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}

export default StatsPage

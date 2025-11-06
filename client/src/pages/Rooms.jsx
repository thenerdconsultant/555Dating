import { useEffect, useRef, useState } from 'react'
import { api } from '../api'
import { useTranslation } from '../i18n/LanguageContext'
import { io } from 'socket.io-client'

const SOCKET_BASE = (import.meta.env.VITE_API_BASE || '').replace(/\/$/, '')

const formatTime = (ts) => {
  if (!ts) return ''
  try {
    return new Date(ts).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  } catch {
    return ''
  }
}

export default function Rooms({ user }) {
  const { t } = useTranslation()
  const [rooms, setRooms] = useState([])
  const [current, setCurrent] = useState(null)
  const [items, setItems] = useState([])
  const [text, setText] = useState('')
  const [roomName, setRoomName] = useState('')
  const [creating, setCreating] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const socketRef = useRef(null)
  const currentRef = useRef(null)
  const canChat = user.gender === 'woman' || user.canSeeLikedMe

  useEffect(() => {
    currentRef.current = current
  }, [current])

  useEffect(() => {
    if (!canChat) {
      setRooms([])
      setCurrent(null)
      setItems([])
      setLoading(false)
      return
    }
    let active = true
    setLoading(true)
    ;(async () => {
      try {
        const list = await api('/api/rooms')
        if (!active) return
        setRooms(list)
        const { token } = await api('/api/auth/socket-token')
        if (!active) return
        const socketUrl = SOCKET_BASE || undefined
        const socket = io(socketUrl, { path: '/socket.io', auth: { token }, withCredentials: true })
        socketRef.current = socket
        socket.on('room_message', msg => {
          if (msg.roomId === currentRef.current?.id) {
            setItems(prev => [...prev, msg])
          }
        })
        socket.on('connect_error', err => {
          setError(err?.message || t('common.error', 'Something went wrong'))
        })
      } catch (err) {
        if (active) {
          setError(err?.message || t('common.error', 'Something went wrong'))
        }
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => {
      active = false
      if (socketRef.current) {
        socketRef.current.close()
        socketRef.current = null
      }
    }
  }, [canChat, t])

  if (!canChat) {
    return (
      <div className="col" style={{ gap: 16 }}>
        <h2>{t('rooms.title', 'Rooms')}</h2>
        <div className="card" style={{ padding: 16 }}>
          {t('rooms.restricted', 'Group chat is available to women and subscribed members.')}
        </div>
      </div>
    )
  }

  function join(room) {
    if (!socketRef.current) return
    setError('')
    socketRef.current.emit('join_room', room.id, response => {
      if (response?.ok) {
        setCurrent(room)
        setItems([])
      } else {
        setError(response?.error || t('common.error', 'Something went wrong'))
      }
    })
  }

  function send(e) {
    e?.preventDefault?.()
    if (!socketRef.current || !current) return
    const message = text.trim()
    if (!message) return
    socketRef.current.emit(
      'room_message',
      { roomId: current.id, text: message },
      response => {
        if (response?.ok) {
          setText('')
        } else {
          setError(response?.error || t('common.error', 'Something went wrong'))
        }
      }
    )
  }

  async function createRoom(e) {
    e?.preventDefault?.()
    const name = roomName.trim()
    if (!name) return
    setCreating(true)
    try {
      const room = await api('/api/rooms', { method: 'POST', body: { name } })
      setRooms(prev => [...prev, room])
      setRoomName('')
      setError('')
    } catch (err) {
      setError(err?.message || t('common.error', 'Something went wrong'))
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="col" style={{ gap: 16 }}>
      <h2>{t('rooms.title', 'Rooms')}</h2>
      {error && (
        <div
          className="pill"
          style={{ background: '#3d1c1c', color: '#ffb3b3', alignSelf: 'flex-start' }}
        >
          {error}
        </div>
      )}
      <form
        className="row"
        style={{ gap: 8, flexWrap: 'wrap' }}
        onSubmit={createRoom}
      >
        <input
          value={roomName}
          onChange={e => setRoomName(e.target.value)}
          placeholder={t('rooms.new', 'Create a new room')}
          style={{ flex: 1, minWidth: 200 }}
        />
        <button
          className="btn secondary"
          type="submit"
          disabled={creating || roomName.trim().length < 2}
        >
          {creating ? t('common.loading', 'Loading...') : t('rooms.create', 'Create room')}
        </button>
      </form>
      <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
        {rooms.map(r => (
          <button
            key={r.id}
            className={`btn secondary ${current?.id === r.id ? 'active' : ''}`}
            onClick={() => join(r)}
            type="button"
          >
            {r.name}
          </button>
        ))}
      </div>
      <div
        className="card col"
        style={{ height: '50vh', overflowY: 'auto', padding: 8, gap: 8 }}
      >
        {loading ? (
          <div className="pill">{t('common.loading', 'Loading...')}</div>
        ) : current ? (
          items.length ? (
            items.map((m, i) => {
              const isMine = m.fromId === user.id
              const bubbleColor = m.gender === 'woman' ? '#ff7ad9' : '#4da6ff'
              const shadow = '0 0 2px rgba(255,255,255,0.9)'
              return (
                <div
                  key={m.id || i}
                  style={{ textAlign: isMine ? 'right' : 'left', marginBottom: 6 }}
                >
                  <div style={{ fontSize: 12, color: '#9aa0a6', marginBottom: 4 }}><strong>{m.displayName || t('rooms.member', 'Member')}</strong>&nbsp;•&nbsp;{formatTime(m.ts)}</div>
                  <span
                    className="pill"
                    style={{
                      background: bubbleColor,
                      color: '#ffffff',
                      textShadow: '0 0 2px rgba(255,255,255,0.95)',
                      boxShadow: shadow,
                      border: '1px solid rgba(255,255,255,0.25)'
                    }}
                  >
                    {m.text}
                  </span>
                </div>
              )
            })
          ) : (
            <div className="pill">
              {t('rooms.empty', 'No messages yet. Say hi!')}
            </div>
          )
        ) : (
          <div className="pill">{t('rooms.select', 'Select a room')}</div>
        )}
      </div>
      <form className="row" onSubmit={send} style={{ gap: 8 }}>
        <input
          style={{ flex: 1 }}
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder={t('messages.input.placeholder', 'Write a message...')}
          disabled={!current || !socketRef.current}
        />
        <button
          className="btn"
          type="submit"
          disabled={!current || !text.trim() || !socketRef.current}
        >
          {t('messages.send', 'Send')}
        </button>
      </form>
    </div>
  )
}


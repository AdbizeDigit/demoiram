import { EventEmitter } from 'events'

// LinkedIn daily limits to avoid ban
const LIMITS = {
  connectionsPerDay: 25,    // Max 25 connection requests/day (LinkedIn limit ~100/week)
  messagesPerDay: 30,       // Max 30 DMs/day
  postsPerDay: 2,           // Max 2 posts/day
  profileViewsPerDay: 50,   // Max 50 profile views/day
  likesPerDay: 50,          // Max 50 likes/day
  commentsPerDay: 15,       // Max 15 comments/day
  minDelayMs: 3000,         // Min 3s between actions
  maxDelayMs: 12000,        // Max 12s between actions
  sessionMaxMinutes: 45,    // Max 45 min session then break
  breakMinutes: 15,         // 15 min break between sessions
}

function humanDelay(min = LIMITS.minDelayMs, max = LIMITS.maxDelayMs) {
  return new Promise(r => setTimeout(r, min + Math.random() * (max - min)))
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

class LinkedInAutomationService extends EventEmitter {
  constructor() {
    super()
    this.sessions = new Map() // profileId -> { browser, page, status, dailyCounts }
    this.actionQueues = new Map() // profileId -> [actions]
    this.processing = new Map() // profileId -> boolean
  }

  // Get or create daily counter
  getDailyCounts(profileId) {
    const key = `${profileId}-${new Date().toDateString()}`
    if (!this.sessions.has(key)) {
      this.sessions.set(key, { connections: 0, messages: 0, posts: 0, views: 0, likes: 0, comments: 0 })
    }
    return this.sessions.get(key)
  }

  canPerformAction(profileId, action) {
    const counts = this.getDailyCounts(profileId)
    switch (action) {
      case 'connect': return counts.connections < LIMITS.connectionsPerDay
      case 'message': return counts.messages < LIMITS.messagesPerDay
      case 'post': return counts.posts < LIMITS.postsPerDay
      case 'view': return counts.views < LIMITS.profileViewsPerDay
      case 'like': return counts.likes < LIMITS.likesPerDay
      case 'comment': return counts.comments < LIMITS.commentsPerDay
      default: return true
    }
  }

  incrementCount(profileId, action) {
    const counts = this.getDailyCounts(profileId)
    if (counts[action + 's'] !== undefined) counts[action + 's']++
    else if (counts[action] !== undefined) counts[action]++
  }

  // Queue an action for a profile
  queueAction(profileId, action) {
    if (!this.actionQueues.has(profileId)) this.actionQueues.set(profileId, [])
    this.actionQueues.get(profileId).push({ ...action, id: Date.now() + Math.random(), status: 'queued', queuedAt: new Date().toISOString() })
    return this.actionQueues.get(profileId)
  }

  getQueue(profileId) {
    return this.actionQueues.get(profileId) || []
  }

  clearQueue(profileId) {
    this.actionQueues.set(profileId, [])
  }

  getStatus(profileId) {
    const session = this.sessions.get(profileId)
    return {
      connected: session?.status === 'connected',
      status: session?.status || 'disconnected',
      dailyCounts: this.getDailyCounts(profileId),
      limits: LIMITS,
      queueSize: (this.actionQueues.get(profileId) || []).filter(a => a.status === 'queued').length,
      processing: this.processing.get(profileId) || false,
    }
  }

  // Generate action schedule respecting limits
  generateSchedule(profileId, actions) {
    const schedule = []
    let time = new Date()

    for (const action of actions) {
      if (!this.canPerformAction(profileId, action.type)) {
        schedule.push({ ...action, scheduledAt: null, reason: `Limite diario alcanzado para ${action.type}` })
        continue
      }

      // Add human-like random delay
      time = new Date(time.getTime() + randomInt(LIMITS.minDelayMs, LIMITS.maxDelayMs))

      // Add break every 45 min
      const sessionStart = schedule.length > 0 ? new Date(schedule[0].scheduledAt) : time
      if (time - sessionStart > LIMITS.sessionMaxMinutes * 60000) {
        time = new Date(time.getTime() + LIMITS.breakMinutes * 60000)
      }

      schedule.push({ ...action, scheduledAt: time.toISOString() })
    }

    return schedule
  }
}

export const linkedinAutomation = new LinkedInAutomationService()
export default linkedinAutomation

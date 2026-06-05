export const SUGGESTION_TYPES = [
  { value: 'request_higher_ranking', label: 'Request higher ranking' },
  { value: 'request_fight', label: 'Request fight against player' },
  { value: 'report_wrong_ranking', label: 'Report wrong ranking' },
  { value: 'general', label: 'General suggestion' },
]

export const SUGGESTION_STATUSES = ['new', 'reviewed', 'approved', 'rejected']

function uniqueId() {
  return `sug_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

export function normalizeSuggestions(raw) {
  if (!Array.isArray(raw)) return []
  return raw.map((suggestion) => ({
    id: suggestion.id,
    submittedBy: suggestion.submittedBy ?? 'Guest',
    submittedByRole: suggestion.submittedByRole ?? 'guest',
    type: suggestion.type ?? 'general',
    playerName: suggestion.playerName ?? '',
    targetPlayerName: suggestion.targetPlayerName ?? '',
    tierlistName: suggestion.tierlistName ?? '',
    message: suggestion.message ?? '',
    status: suggestion.status ?? 'new',
    createdAt: suggestion.createdAt ?? new Date().toISOString(),
  }))
}

export function createSuggestionPayload({
  submittedBy,
  submittedByRole,
  type,
  playerName,
  targetPlayerName,
  tierlistName,
  message,
}) {
  return {
    id: uniqueId(),
    submittedBy: submittedBy ?? 'Guest',
    submittedByRole: submittedByRole ?? 'guest',
    type: type ?? 'general',
    playerName: playerName?.trim() ?? '',
    targetPlayerName: targetPlayerName?.trim() ?? '',
    tierlistName: tierlistName?.trim() ?? '',
    message: message?.trim() ?? '',
    status: 'new',
    createdAt: new Date().toISOString(),
  }
}

export function appendSuggestion(data, suggestion) {
  return {
    ...data,
    suggestions: [suggestion, ...(data.suggestions ?? [])],
  }
}

export function updateSuggestionStatus(data, suggestionId, status) {
  const existing = (data.suggestions ?? []).find((suggestion) => suggestion.id === suggestionId)
  if (!existing) {
    return { success: false, error: 'Suggestion not found.' }
  }

  if (!SUGGESTION_STATUSES.includes(status)) {
    return { success: false, error: 'Invalid suggestion status.' }
  }

  const suggestions = (data.suggestions ?? []).map((suggestion) =>
    suggestion.id === suggestionId ? { ...suggestion, status } : suggestion,
  )

  return {
    success: true,
    data: { ...data, suggestions },
    suggestion: suggestions.find((item) => item.id === suggestionId),
    previousStatus: existing.status,
  }
}

export function deleteSuggestion(data, suggestionId) {
  const existing = (data.suggestions ?? []).find((suggestion) => suggestion.id === suggestionId)
  if (!existing) {
    return { success: false, error: 'Suggestion not found.' }
  }

  return {
    success: true,
    data: {
      ...data,
      suggestions: (data.suggestions ?? []).filter((suggestion) => suggestion.id !== suggestionId),
    },
    removed: existing,
  }
}

export function getSuggestionTypeLabel(type) {
  return SUGGESTION_TYPES.find((item) => item.value === type)?.label ?? type
}

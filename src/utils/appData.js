import {
  DATA_VERSION,
  OVERALL_ID,
  DEFAULT_POINT_SYSTEM,
  calculateOverall,
  migrateTierlistFromRaw,
} from './tierlistsStorage'
import {
  getManagedAdmins,
  normalizeManagedAdmins,
  isOwnerRecord,
} from './adminStorage'

export { getManagedAdmins, normalizeManagedAdmins, isOwnerRecord }

function createDefaultTierlist() {
  return {
    id: OVERALL_ID,
    name: 'Overall',
    isDefault: true,
    isCalculated: true,
    autoTierAssignment: true,
    pointSystem: { ...DEFAULT_POINT_SYSTEM },
    icon: null,
    color: null,
    description: '',
    contributesToOverall: false,
    players: [],
  }
}

export function createDefaultAppData() {
  return {
    version: DATA_VERSION,
    tierlists: [createDefaultTierlist()],
    admins: [],
    logs: [],
    settings: {},
  }
}

export function prepareAppData(raw) {
  let tierlists = (raw?.tierlists ?? []).map(migrateTierlistFromRaw)
  if (!tierlists.some((t) => t.id === OVERALL_ID)) {
    tierlists.unshift(createDefaultTierlist())
  }

  const calculated = calculateOverall({
    version: DATA_VERSION,
    settings: raw?.settings ?? {},
    logs: Array.isArray(raw?.logs) ? raw.logs : [],
    tierlists,
  })

  return {
    ...calculated,
    admins: normalizeManagedAdmins(raw?.admins),
  }
}

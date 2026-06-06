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
import { migrateLegacyToGlobalPlayers, syncTierlistsWithSmpPlayers } from './playerSync'
import { normalizeSmpPlayers } from './smpPlayers'
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
    settings: {},
  }
}

export function mergeAppDataSources(core, smpPlayers = [], logs = []) {
  return prepareAppData({
    version: core?.version ?? DATA_VERSION,
    settings: core?.settings ?? {},
    admins: core?.admins ?? [],
    tierlists: core?.tierlists ?? [],
    smpPlayers,
    logs,
  })
}

export function prepareAppData(raw) {
  let tierlists = (raw?.tierlists ?? []).map(migrateTierlistFromRaw)
  if (!tierlists.some((t) => t.id === OVERALL_ID)) {
    tierlists.unshift(createDefaultTierlist())
  }

  let data = {
    version: DATA_VERSION,
    settings: raw?.settings ?? {},
    logs: Array.isArray(raw?.logs) ? raw.logs : [],
    tierlists,
    smpPlayers: normalizeSmpPlayers(raw?.smpPlayers),
    admins: normalizeManagedAdmins(raw?.admins),
  }

  data = migrateLegacyToGlobalPlayers(data)
  data = syncTierlistsWithSmpPlayers(data)
  data = calculateOverall(data)

  return {
    ...data,
    admins: normalizeManagedAdmins(raw?.admins),
  }
}

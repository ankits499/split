export interface LocalMember {
  id: string
  name: string
}

export interface LocalGroup {
  id: string
  name: string
  memberIds: string[]
}

export interface LocalSplit {
  memberId: string
  share: number
}

export interface LocalExpense {
  id: string
  groupId: string
  description: string
  amount: number
  paidBy: string
  date: string
  createdAt: string
  splits: LocalSplit[]
}

export interface LocalSettlement {
  id: string
  groupId: string
  from: string
  to: string
  amount: number
  createdAt: string
}

interface LocalData {
  members: LocalMember[]
  groups: LocalGroup[]
  expenses: LocalExpense[]
  settlements: LocalSettlement[]
}

const STORAGE_KEY = 'split-local-data-v1'
export const ME_ID = 'me'

function emptyData(): LocalData {
  return {
    members: [{ id: ME_ID, name: 'You' }],
    groups: [],
    expenses: [],
    settlements: [],
  }
}

function load(): LocalData {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return emptyData()
  try {
    const parsed = JSON.parse(raw) as LocalData
    if (!parsed.members.some((m) => m.id === ME_ID)) {
      parsed.members.unshift({ id: ME_ID, name: 'You' })
    }
    return parsed
  } catch {
    return emptyData()
  }
}

function save(data: LocalData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

function newId(): string {
  return crypto.randomUUID()
}

export const localDb = {
  getData: load,

  getOrCreateMember(name: string): LocalMember {
    const data = load()
    const trimmed = name.trim()
    const existing = data.members.find((m) => m.name.toLowerCase() === trimmed.toLowerCase())
    if (existing) return existing
    const member: LocalMember = { id: newId(), name: trimmed }
    data.members.push(member)
    save(data)
    return member
  },

  renameMe(name: string) {
    const data = load()
    const me = data.members.find((m) => m.id === ME_ID)
    if (me) me.name = name.trim() || 'You'
    save(data)
  },

  createGroup(name: string, memberNames: string[]): LocalGroup {
    const data = load()
    const memberIds = [ME_ID]
    for (const rawName of memberNames) {
      const trimmed = rawName.trim()
      if (!trimmed) continue
      const existing = data.members.find((m) => m.name.toLowerCase() === trimmed.toLowerCase())
      const member = existing ?? { id: newId(), name: trimmed }
      if (!existing) data.members.push(member)
      if (!memberIds.includes(member.id)) memberIds.push(member.id)
    }
    const group: LocalGroup = { id: newId(), name: name.trim(), memberIds }
    data.groups.push(group)
    save(data)
    return group
  },

  addMember(groupId: string, name: string): LocalMember {
    const data = load()
    const trimmed = name.trim()
    const existing = data.members.find((m) => m.name.toLowerCase() === trimmed.toLowerCase())
    const member = existing ?? { id: newId(), name: trimmed }
    if (!existing) data.members.push(member)
    const group = data.groups.find((g) => g.id === groupId)
    if (group && !group.memberIds.includes(member.id)) group.memberIds.push(member.id)
    save(data)
    return member
  },

  addExpense(input: {
    groupId: string
    description: string
    amount: number
    paidBy: string
    date: string
    splits: LocalSplit[]
  }): LocalExpense {
    const data = load()
    const expense: LocalExpense = {
      id: newId(),
      groupId: input.groupId,
      description: input.description,
      amount: input.amount,
      paidBy: input.paidBy,
      date: input.date,
      createdAt: new Date().toISOString(),
      splits: input.splits,
    }
    data.expenses.push(expense)
    save(data)
    return expense
  },

  deleteExpense(expenseId: string) {
    const data = load()
    data.expenses = data.expenses.filter((e) => e.id !== expenseId)
    save(data)
  },

  addSettlement(input: { groupId: string; from: string; to: string; amount: number }): LocalSettlement {
    const data = load()
    const settlement: LocalSettlement = {
      id: newId(),
      groupId: input.groupId,
      from: input.from,
      to: input.to,
      amount: input.amount,
      createdAt: new Date().toISOString(),
    }
    data.settlements.push(settlement)
    save(data)
    return settlement
  },

  resetAll() {
    save(emptyData())
  },
}

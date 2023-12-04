export const RecordStatuses = ["approved", "pending", "rejected"] as const
export const UserRoles = ["superuser", "corrector", "annotator", "contributor"] as const

export type RecordStatusType = typeof RecordStatuses[number]
export type UserRoleType = typeof UserRoles[number]
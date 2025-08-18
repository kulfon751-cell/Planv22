import { prisma } from '../prisma'

export type AuditAction = 'import.apply' | 'ops.update' | 'ops.delete' | 'ops.create' | 'backup.run' | 'backup.restore' | 'profile.create' | 'profile.update' | 'profile.delete'

export async function writeAudit(params: {
  action: AuditAction
  entity: string
  entityId: string
  before?: any
  after?: any
  userId?: string
  role?: string
  ip?: string
  userAgent?: string
  txnId?: string
}) {
  try {
    await prisma.auditLog.create({
      data: {
        action: params.action,
        entity: params.entity,
        entityId: params.entityId,
        before: params.before as any,
        after: params.after as any,
        userId: params.userId,
        role: params.role,
        ip: params.ip,
        userAgent: params.userAgent,
        txnId: params.txnId,
      }
    })
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('audit_write_failed', e)
  }
}

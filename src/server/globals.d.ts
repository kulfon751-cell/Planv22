export {}

declare global {
  // Broadcast events to ws clients
  // eslint-disable-next-line no-var
  var __PM_PLAN_BROADCAST__: ((event: any) => void) | undefined
}

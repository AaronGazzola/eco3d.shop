import { Behavior, BehaviorContext, DragonDrive, zeroDrive } from '../types'

export function createWanderingBehavior(): Behavior {
  return {
    id: 'wandering',
    update(ctx: BehaviorContext): DragonDrive {
      const drive = zeroDrive()
      const t = ctx.targetRef.current
      drive.headTarget = { x: t.x, y: 0, z: t.z }
      drive.legCadence = 1
      return drive
    },
  }
}

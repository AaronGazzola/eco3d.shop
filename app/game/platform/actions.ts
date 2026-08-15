import { GameAction } from '../core/types'

// The one place a chat command becomes a game action. A command the game does not
// handle is not a failure of the platform: the streamer's registry is theirs, and
// a keyword can exist there that this version of the game knows nothing about.
const BY_KEYWORD: Record<string, GameAction> = {
  feed: { kind: 'feed' },
}

export function actionForCommand(keyword: string): GameAction | null {
  return BY_KEYWORD[keyword] ?? null
}

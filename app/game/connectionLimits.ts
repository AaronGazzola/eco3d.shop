export const HEAD_BODY_YAW_MIN = -0.5;
export const HEAD_BODY_YAW_MAX = 0.45;
export const HEAD_BODY_PITCH = 0.5;

export const BODY_BODY_PITCH = 0.25;

export const BODY_BODY_YAW_MIN = -0.4;
export const BODY_BODY_YAW_MAX = 0.35;

export const BODY_TAIL_YAW_MIN = -0.45;
export const BODY_TAIL_YAW_MAX = 0.1;
export const BODY_TAIL_PITCH = 0.2;

export type ConnectionParams = { position: number; yaw: number; pitch: number; roll: number };

export const HEAD_BODY_PRESETS: Record<string, ConnectionParams> = {
  default: { position: 0.35, yaw: -0.041592653589793, pitch: -1.09159265358979,  roll:  0.008407346410207 },
  left:    { position: 0.33, yaw: -0.541592653589793, pitch: -1.19159265358979,  roll:  0.108407346410207 },
  right:   { position: 0.31, yaw:  0.408407346410207, pitch: -1.19159265358979,  roll: -0.091592653589793 },
  up:      { position: 0.89, yaw: -0.091592653589793, pitch: -0.69159265358979,  roll:  0.008407346410207 },
  down:    { position: 0.23, yaw: -0.041592653589793, pitch: -1.09159265358979,  roll:  0.008407346410207 },
};

export const BODY_BODY_PRESETS: Record<string, ConnectionParams> = {
  default: { position: 0.36, yaw: -0.091592653589793, pitch: -1.14159265358979,  roll:  0.008407346410207 },
  left:    { position: 0.37, yaw: -0.491592653589793, pitch: -1.09159265358979,  roll:  0.058407346410207 },
  right:   { position: 0.37, yaw:  0.258407346410207, pitch: -1.09159265358979,  roll: -0.041592653589793 },
  up:      { position: 0.87, yaw: -0.091592653589793, pitch: -0.841592653589793, roll: -0.041592653589793 },
  down:    { position: 0.25, yaw: -0.091592653589793, pitch: -1.09159265358979,  roll:  0.008407346410207 },
};

export const BODY_TAIL_PRESETS: Record<string, ConnectionParams> = {
  default: { position: 0.33, yaw:  2.90840734641021,  pitch: -0.691592653589793, roll:  0.108407346410207 },
  left:    { position: 0.33, yaw:  2.50840734641021,  pitch: -0.691592653589793, roll:  0.158407346410207 },
  right:   { position: 0.33, yaw: -2.89159265358979,  pitch: -0.741592653589793, roll:  0.008407346410207 },
  up:      { position: 0.61, yaw:  2.95840734641021,  pitch: -0.541592653589793, roll:  0.108407346410207 },
  down:    { position: 0.33, yaw:  2.90840734641021,  pitch: -0.791592653589793, roll:  0.108407346410207 },
};

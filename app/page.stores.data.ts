import type { Sphere, ColumnShape, PhysicsParams, BodyConnectionParams, ConnectionLimits } from "./page.stores";

export const INITIAL_COLLISION_SPHERES: Record<string, Sphere[]> = {
  "Dragon-0": [
    { id: "tc-0", position: [-0.18902661357841008, -0.09058040774290421,  0.15673145498029564],  radius: 0.05 },
    { id: "tc-1", position: [-0.2722154249402873,  -0.08789784014800947, -0.04271139095936209],  radius: 0.05 },
    { id: "tc-2", position: [-0.15742739900074332, -0.2352171255200429,   0.1526911526047554],   radius: 0.05 },
    { id: "tc-3", position: [-0.23569496629616313, -0.23756147868992833, -0.06899826605281706],  radius: 0.05 },
    { id: "tc-4", position: [-0.42753258041390796, -0.11236065242217713,  0.12938394918303536],  radius: 0.2  },
    { id: "tc-5", position: [-0.7099809969925861,  -0.15377087652763144,  0.23382531175001914],  radius: 0.16 },
  ],
  "Dragon-1": [
    { id: "bc-0",  position: [-0.10110308499210993,  0.20066870178943308,   0.020109666398530415],  radius: 0.05 },
    { id: "bc-1",  position: [-0.043605953573999365, 0.10230040458146683,   0.14928566327752618],   radius: 0.05 },
    { id: "bc-2",  position: [-0.059414967130359,   -0.014442724954053729,  0.2428335114557105],    radius: 0.05 },
    { id: "bc-3",  position: [-0.07811887508717075, -0.14571505829387316,   0.27847967106530513],   radius: 0.05 },
    { id: "bc-4",  position: [-0.08764286932451332,  0.10153523768608261,  -0.10868443404188062],   radius: 0.05 },
    { id: "bc-5",  position: [-0.11963261115447921, -0.015798097716982214, -0.19750099916934105],   radius: 0.05 },
    { id: "bc-6",  position: [-0.14491743802251555, -0.14174247389800224,  -0.23150205943886148],   radius: 0.05 },
    { id: "bc-7",  position: [-0.14521321971984158, -0.26289547699207166,  -0.23620306964922844],   radius: 0.05 },
    { id: "bc-8",  position: [-0.08618279034310335, -0.26269722035435716,   0.2959598315189925],    radius: 0.05 },
    { id: "bc-9",  position: [-0.071327081329419,    0.022899828314349363,  0.020450129745746264],  radius: 0.07 },
    { id: "bc-10", position: [-0.11455788585558108, -0.26373597616352695,   0.022873327572993395],  radius: 0.05 },
    { id: "bc-11", position: [ 0.029971412751185478,-0.2635880627924984,   -0.1213615089756784],    radius: 0.05 },
    { id: "bc-12", position: [ 0.07649737804950016, -0.26319404599408264,   0.10246181445377553],   radius: 0.05 },
    { id: "bc-13", position: [ 0.09661177402128582, -0.107994768150111,     0.11038169414047017],   radius: 0.05 },
    { id: "bc-14", position: [ 0.0577739933349824,  -0.10451807548163852,  -0.11058411100770685],   radius: 0.05 },
  ],
  "Dragon-2": [
    { id: "hc-0",  position: [0.22949287360514853,  -0.26275243063179454,   0.27003318810201843],  radius: 0.05 },
    { id: "hc-1",  position: [0.13231151423224283,  -0.13759689204666725,   0.31510740991162994],  radius: 0.05 },
    { id: "hc-2",  position: [0.5420775087388758,   -0.08476038504674221,   0.021199827613015573], radius: 0.23 },
    { id: "hc-3",  position: [0.15023006247317744,   0.21050935269546667,   0.3118011651908595],   radius: 0.05 },
    { id: "hc-4",  position: [0.18870555382720405,   0.18652170690108108,   0.1447273421286055],   radius: 0.05 },
    { id: "hc-5",  position: [0.12163106065848116,   0.2570481649455293,   -0.0065432202325735565],radius: 0.05 },
    { id: "hc-6",  position: [0.22003224956971124,   0.19779646549720817,  -0.13943022564292576],  radius: 0.05 },
    { id: "hc-7",  position: [0.2213176296122351,    0.21809095971200157,  -0.316970766936769],    radius: 0.05 },
    { id: "hc-8",  position: [0.19788200413015486,  -0.0026961228681275304, -0.28181739136352957], radius: 0.05 },
    { id: "hc-9",  position: [0.19262352368864155,  -0.14074997002279224,  -0.32599825510338953],  radius: 0.05 },
    { id: "hc-10", position: [0.27405105935234375,  -0.26197460162854513,  -0.2522633136532252],   radius: 0.05 },
    { id: "hc-11", position: [0.16618257412230036,  -0.2625100465512169,   -0.0034930546324435582],radius: 0.05 },
    { id: "hc-12", position: [0.16397969781817268,   0.03232288707867931,   0],                    radius: 0.05 },
    { id: "hc-13", position: [0.292384989961772,    -0.09072888019366185,  -0.22838467776732324],  radius: 0.09 },
    { id: "hc-14", position: [0.2943472828342436,   -0.23755753863883805,  -0.1941260909735827],   radius: 0.07 },
    { id: "hc-15", position: [0.25316304062434497,  -0.20307834283025888,   0.19674343579920434],  radius: 0.05 },
    { id: "hc-16", position: [0.16032804773113218,   0.00037232307423414046, 0.27142701056719465], radius: 0.05 },
    { id: "hc-17", position: [0.7864449993301266,   -0.1126818912791111,    0.04976136826101782],  radius: 0.2  },
    { id: "hc-18", position: [0.22767492708216652,  -0.18144213873757367,   0.27708711514904205],  radius: 0.09 },
    { id: "hc-19", position: [0.29043286934758666,  -0.23200611988295172,  -0.2221577872283747],   radius: 0.08 },
    { id: "hc-20", position: [0.19382514080440838,   0.14398033164262364,   0.20096731113610336],  radius: 0.11 },
    { id: "hc-21", position: [0.24502874953528508,   0.1303429397604397,   -0.2246145902437261],   radius: 0.11 },
  ],
};

export const INITIAL_FRONT_CONNECTION: Record<string, Sphere> = {
  "Dragon-0": { id: "tail-fc", position: [-0.15, -0.187, 0.025], radius: 0.05 },
  "Dragon-1": { id: "body-fc", position: [0.119, -0.172, -0.011], radius: 0.05 },
};

export const INITIAL_BACK_CONNECTION: Record<string, ColumnShape> = {
  "Dragon-1": { center: [-0.12664464610153475, -0.1474047281854786, 0.023709817142268982], height: 0.21, radius: 0.045, curve: -0.1, rotationX: 0.008407346410207, rotationY: 0.208407346410207, rotationZ: 0 },
  "Dragon-2": { center: [0.15082665660707434, -0.1383574268685387, -0.008679154171006993], height: 0.2, radius: 0.05, curve: -0.1, rotationX: 0.008407346410207, rotationY: -0.041592653589793, rotationZ: 0 },
};

export const INITIAL_FRONT_POINTS: Record<string, Sphere[]> = {
  "Dragon-2": [
    { id: "hfp-0", position: [0.9632794230923789, -0.124749918818649, 0.06826465183586246], radius: 0.05 },
  ],
};

export const INITIAL_BACK_POINTS: Record<string, Sphere[]> = {
  "Dragon-0": [
    { id: "tbp-0", position: [-0.8987183778323097, -0.2614866178212536, 0.2963235059914382], radius: 0.05 },
  ],
};

export const DEFAULT_PHYSICS_PARAMS: PhysicsParams = {
  cursorStiffness: 8,
  cursorDamping: 5,
  segmentDamping: 2,
  followSpeed: 5,
};

export const DEFAULT_BODY_CONNECTION_PARAMS: BodyConnectionParams = { position: 0.32, yaw: -0.1, pitch: -0.95, roll: 0 };
export const DEFAULT_BODY_TO_BODY_CONNECTION_PARAMS: BodyConnectionParams = { position: 0.37, yaw: 0, pitch: -0.95, roll: 0 };
export const DEFAULT_BODY_TO_TAIL_CONNECTION_PARAMS: BodyConnectionParams = { position: 0.33, yaw: 2.691592653589793, pitch: -0.9, roll: 0 };

export const DEFAULT_HEAD_BODY_LIMITS: ConnectionLimits = { positionMin: 0.32, positionMax: 0.81, yawMin: -0.7, yawMax: 0.45, pitchMin: -1.25, pitchMax: -0.85, rollMin: -0.15, rollMax: 0.2 };
export const DEFAULT_BODY_BODY_LIMITS: ConnectionLimits = { positionMin: 0.37, positionMax: 0.75, yawMin: -0.45, yawMax: 0.25, pitchMin: -1.25, pitchMax: -0.75, rollMin: -0.1, rollMax: 0.15 };
export const DEFAULT_BODY_TAIL_LIMITS: ConnectionLimits = { positionMin: 0.33, positionMax: 0.73, yawMin: 2.691592653589793, yawMax: 3.241592653589793, pitchMin: -1, pitchMax: -0.4, rollMin: -0.15, rollMax: 0.2 };

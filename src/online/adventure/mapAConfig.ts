import plan from './floor1-maze.json';
const props=plan.props.map(prop=>prop.id==='maze_chest_35'?{...prop,x:53}:prop);
export const MAP_A={...plan,props};
export const MAP_A_AREAS=plan.areas;
export const MAP_A_PROPS=props;
export const MAP_A_GATES=plan.gates;
export const MAP_A_BASE_ENEMIES=plan.enemies;
export const MAP_A_ENEMIES=plan.enemies;
export const MAP_A_SCENERY=plan.objects;

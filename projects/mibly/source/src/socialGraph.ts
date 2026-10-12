import { users, venues, type Meal } from "./data";

export const SELF = "daniel";
export type Circle = "friends" | "extended";
export type Network = { friends: string[]; outgoing: string[]; incoming: string[]; hidden: string[] };
export const initialNetwork = (): Network => ({friends:["maya","eric","anika","jordan"],outgoing:[],incoming:["priya"],hidden:[]});
const links: Record<string,string[]> = {chloe:["maya"],noah:["eric","anika"],priya:["jordan"]};
export function readNetwork(value: unknown): Network {
  if (!value || typeof value !== "object") return initialNetwork();
  const saved=value as Partial<Network>, valid=(list:unknown)=>Array.isArray(list)?[...new Set(list.filter((id):id is string=>typeof id==="string"&&id!==SELF&&users.some(u=>u.id===id)))]:[];
  const friends=Array.isArray(saved.friends)?valid(saved.friends):initialNetwork().friends;
  return {friends,outgoing:valid(saved.outgoing).filter(id=>!friends.includes(id)),incoming:valid(saved.incoming).filter(id=>!friends.includes(id)),hidden:valid(saved.hidden)};
}
export const mutualFriends = (id:string, network:Network) => (links[id]||[]).filter(friend=>network.friends.includes(friend));
export const relationship = (id:string, network:Network) => id===SELF?"self":network.friends.includes(id)?"friend":network.incoming.includes(id)?"incoming":network.outgoing.includes(id)?"pending":"none";
export function updateConnection(network:Network,id:string,action:"request"|"cancel"|"accept"|"decline"|"hide"|"unhide"): Network {
  if(id===SELF||!users.some(u=>u.id===id))return network;
  const status=relationship(id,network);
  if(action==="request"&&status==="none")return {...network,outgoing:[...network.outgoing,id]};
  if(action==="cancel")return {...network,outgoing:network.outgoing.filter(x=>x!==id)};
  if(action==="accept"&&status==="incoming")return {...network,friends:[...network.friends,id],incoming:network.incoming.filter(x=>x!==id),outgoing:network.outgoing.filter(x=>x!==id)};
  if(action==="decline")return {...network,incoming:network.incoming.filter(x=>x!==id)};
  if(action==="hide")return {...network,hidden:[...new Set([...network.hidden,id])]};
  if(action==="unhide")return {...network,hidden:network.hidden.filter(x=>x!==id)};
  return network;
}
export function canReadMeal(meal:Meal,network:Network):boolean {
  if(meal.userId===SELF)return true;
  if(meal.audience==="private")return false;
  if(network.friends.includes(meal.userId))return true;
  return mutualFriends(meal.userId,network).length>0&&meal.discoverable===true&&meal.type==="restaurant"&&venues.some(venue=>venue.id===meal.venueId);
}
export function circleMeals(meals:Meal[],network:Network,circle:Circle):Meal[] {
  return meals.filter(meal=>meal.audience!=="private"&&!network.hidden.includes(meal.userId)&&canReadMeal(meal,network)&&(circle==="friends"?(meal.userId===SELF||network.friends.includes(meal.userId)):(meal.userId!==SELF&&!network.friends.includes(meal.userId)))).sort((a,b)=>(b.date+b.time).localeCompare(a.date+a.time));
}

import EarthView from './EarthView';
import type {Flight} from './domain';
export default function RouteMap({flights,selected,compact=false,onSelect,showGaps=true}:{flights:Flight[];selected?:string;compact?:boolean;globe?:boolean;showGaps?:boolean;onSelect?:(id:string)=>void}){
 return <div className={`route-map interactive-route ${compact?'compact':''}`}><EarthView flights={flights} selected={selected} showGaps={showGaps} onSelect={onSelect}/>{onSelect&&<div className="map-route-buttons" aria-label="Highlight a flight">{flights.filter(f=>f.status!=='canceled').map((f,i)=><button key={f.id} className={selected===f.id?'selected':''} onClick={()=>onSelect(f.id)} aria-label={`Highlight ${f.from} to ${f.to}`}>{i+1}</button>)}</div>}</div>;
}

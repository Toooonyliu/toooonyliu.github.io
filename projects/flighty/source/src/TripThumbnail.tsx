import {GlobeHemisphereWest} from '@phosphor-icons/react';
import {tripDestination,airports,type Trip,type Flight} from './domain';
const art:Record<string,string>={HND:'tokyo',ORD:'chicago',LHR:'london',JFK:'newyork',EWR:'newyork',HKG:'hongkong',LAX:'losangeles'};
export default function TripThumbnail({trip,records}:{trip:Trip;records:Flight[]}){const destination=trip.destination??tripDestination(trip,records),name=airports[destination]?.city??trip.title,src=trip.cover??(art[destination]?`/assets/destinations/${art[destination]}.webp`:null);return <span className="trip-thumbnail">{src?<img src={src} loading="lazy" decoding="async" alt={`${name} destination`} draggable={false}/>:<GlobeHemisphereWest size={32} aria-label={`${name} destination avatar`}/>}</span>;}

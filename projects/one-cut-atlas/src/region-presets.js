/** Artistic travel zones, not political borders. This is the editable art direction table. */
export const TRAVEL_ZONES = [
 {id:'east-asia',label:'East Asia',name:'East Asia',stage:'Kyoto Rain',lat:35.01,lon:135.77,place:'Kyoto',country:'Japan',environment:'traditional_street',lighting:'night',style:'kendo',flagship:true,color:'#a794aa',palette:{sky:'#57465f',accent:'#e6b66e',ambient:'#243442'},elements:['wooden_buildings','lanterns'],summary:'Warm lanterns. Rain on stone.'},
 {id:'south-asia',label:'South Asia',name:'South Asia',stage:'Monsoon Courtyard',lat:26.92,lon:75.79,place:'Jaipur',country:'India',environment:'traditional_street',lighting:'sunset',style:'traveler',color:'#c29c72',palette:{sky:'#7f6478',accent:'#e4b27a',ambient:'#484354'},elements:['wooden_buildings','water'],summary:'Monsoon rain. Sandstone walls.'},
 {id:'southeast-asia',label:'Southeast Asia',name:'Southeast Asia',stage:'River Lanterns',lat:13.75,lon:100.5,place:'Bangkok',country:'Thailand',environment:'forest',lighting:'night',style:'traveler',color:'#85b09a',palette:{sky:'#386965',accent:'#e6bb79',ambient:'#203c3e'},elements:['trees','water','lanterns'],summary:'River shadows. Floating lights.'},
 {id:'west-central-asia',label:'West / Central Asia',name:'West & Central Asia',stage:'Stone Passage',lat:39.65,lon:66.96,place:'Samarkand',country:'Uzbekistan',environment:'traditional_street',lighting:'sunset',style:'traveler',color:'#b78d82',palette:{sky:'#9d7172',accent:'#e1bb88',ambient:'#524151'},elements:['wooden_buildings','rocks'],summary:'Stone arches at dusk.'},
 {id:'europe',label:'Europe',name:'Europe',stage:'Old Quarter',lat:48.86,lon:2.35,place:'Paris',country:'France',environment:'modern_city',lighting:'sunset',style:'suit',color:'#8f9db9',palette:{sky:'#74748e',accent:'#dab38b',ambient:'#344253'},elements:['skyscrapers','water'],summary:'Old streets. Distant bells.'},
 {id:'africa',label:'Africa',name:'Africa',stage:'Cairo River Dusk',lat:30.04,lon:31.24,place:'Cairo',country:'Egypt',environment:'wilderness',lighting:'sunset',style:'traveler',flagship:true,color:'#c49a77',palette:{sky:'#a77573',accent:'#e4b87d',ambient:'#38344d'},elements:['rocks','water'],summary:'Copper skies above the Nile.'},
 {id:'north-america',label:'North America',name:'North America',stage:'New York Underpass',lat:40.71,lon:-74.01,place:'New York',country:'United States',environment:'modern_city',lighting:'night',style:'suit',flagship:true,color:'#92b5be',palette:{sky:'#272c48',accent:'#cf9d68',ambient:'#182633'},elements:['skyscrapers','neon_signs'],summary:'Steel pillars. Amber streetlights.'},
 {id:'south-america',label:'South America',name:'South America',stage:'Mountain Passage',lat:-22.91,lon:-43.17,place:'Rio',country:'Brazil',environment:'forest',lighting:'sunset',style:'traveler',color:'#91a87b',palette:{sky:'#ba8386',accent:'#d9bd7d',ambient:'#34534a'},elements:['trees','mountains'],summary:'Mountain shadows. Forest winds.'},
 {id:'oceania',label:'Oceania',name:'Oceania',stage:'Coastal Quiet',lat:-33.87,lon:151.21,place:'Sydney',country:'Australia',environment:'wilderness',lighting:'day',style:'cowboy',color:'#b5b087',palette:{sky:'#83aaa9',accent:'#d4b486',ambient:'#526774'},elements:['rocks','water'],summary:'Sea winds on an empty shore.'},
 {id:'arctic',label:'Arctic',name:'Arctic',stage:'Polar Blue',lat:78.2,lon:15.6,place:'Arctic',country:'Polar region',environment:'wilderness',lighting:'night',style:'traveler',color:'#a9c8ca',palette:{sky:'#385776',accent:'#b5d9d4',ambient:'#24495f'},elements:['mountains','water'],summary:'Blue ice. Endless night.'},
 {id:'antarctic',label:'Antarctic',name:'Antarctic',stage:'White Horizon',lat:-77.85,lon:166.67,place:'Antarctic',country:'Polar region',environment:'wilderness',lighting:'day',style:'traveler',color:'#c1d1d3',palette:{sky:'#bac9cf',accent:'#e4e7d6',ambient:'#71919d'},elements:['mountains','rocks'],summary:'Snow to the horizon.'},
];
export const getZone = id => TRAVEL_ZONES.find(zone=>zone.id===id) || TRAVEL_ZONES[0];
export function zoneForCoordinates(lat,lon){
 if(lat>=66.5)return getZone('arctic');
 if(lat<=-60)return getZone('antarctic');
 if(lon<=-30)return getZone(lat>12?'north-america':'south-america');
 if(lat<-10&&lon>100)return getZone('oceania');
 if(lon>=92&&lat<25)return getZone('southeast-asia');
 if(lon>=60&&lon<92&&lat<35&&lat>0)return getZone('south-asia');
 if(lon>=92)return getZone('east-asia');
 if(lat>=36&&lon<45)return getZone('europe');
 if((lon>=35&&lat>=12)||lon>=52)return getZone('west-central-asia');
 return getZone('africa');
}
export function sceneForZone(id){
 const zone=getZone(id);
 return {travelZone:zone.id,stageId:zone.flagship?zone.id:null,environment:zone.environment,lighting:zone.lighting,elements:[...zone.elements],palette:{...zone.palette},opponentStyle:zone.style,summary:zone.summary,source:'manual'};
}
export function createZoneLevels(){return TRAVEL_ZONES.map((zone,index)=>({id:`zone-${zone.id}`,name:zone.stage,location:{name:zone.place,country:zone.country,lat:zone.lat,lon:zone.lon},scene:sceneForZone(zone.id),photo:null,cleared:false,isDemo:true,createdAt:`2026-10-07T00:00:${String(index).padStart(2,'0')}Z`}));}

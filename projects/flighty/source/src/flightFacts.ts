export const cx882Facts={
 scheduledDeparture:'2023-08-31T16:45:00+08:00',scheduledArrival:'2023-08-31T15:10:00-07:00',departureDelay:6,departureTerminal:'1',arrivalTerminal:'B',
 forecast:{observed:25,averageLate:37,rows:[['Early',20,'#00aa60'],['On Time',32,'#3fd355'],['15m late',16,'#ffd300'],['30m late',8,'#ff9700'],['45m+ late',24,'#ff3b30'],['Canceled',0,'#777'],['Diverted',0,'#777']] as [string,number,string][]},
 timetable:[
 {group:'DEPART',rows:[['Gate Departure','4:45 PM','4:51 PM','late'],['Taxi','10m','19m','late'],['Take Off','4:55 PM','5:10 PM','late']]},
 {group:'ARRIVE',rows:[['Land','1:26 PM','3:04 PM','late'],['Taxi','1h 43m','8m','early'],['Gate Arrival','3:10 PM','3:13 PM','late']]},
 {group:'TOTALS',rows:[['Air Time','11h 31m','12h 54m','late'],['Total Time','13h 25m','13h 22m','early']]},
 ],
};

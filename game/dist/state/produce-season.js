// Shared by the seasonal display and transaction context, never called by reducers.
export const PRODUCE_TIME_ZONE='Asia/Seoul';
const monthFormat=new Intl.DateTimeFormat('en-US',{timeZone:PRODUCE_TIME_ZONE,month:'numeric'});
export function calendarSeason(date=new Date()){
 if(!(date instanceof Date)||!Number.isFinite(date.getTime()))return null;
 const month=Number(monthFormat.format(date));return month>=3&&month<=5?'spring':month>=6&&month<=8?'summer':month>=9&&month<=11?'autumn':'winter';
}

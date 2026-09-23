import {readJournal,writeJournal,validEntry} from './journal.js?v=ask9';
const clone=value=>structuredClone(value);
const outcomes=['pending','matched','partial','missed','unclear'];
export function cleanReview(value={}){
 return {outcome:outcomes.includes(value.outcome)?value.outcome:'pending',note:typeof value.note==='string'?value.note.slice(0,2000):'',actualDate:/^\d{4}-\d{2}-\d{2}$/.test(value.actualDate||'')?value.actualDate:''};
}
export function decodeRow(row){
 const entry={...row.payload,id:row.id,review:cleanReview(row.review)};
 if(!validEntry(entry))throw new Error('invalid_record');
 return entry;
}
export class AccountStore{
 constructor(storage,client=null){
  this.storage=storage;this.client=client;this.user=null;this.epoch=0;this.pending=[];this.listeners=new Set();this.loading=!!client;this.error='';this.saving=false;this.loadGuest();
 }
 loadGuest(){const state=readJournal(this.storage);this.entries=state.entries;this.guestCorrupt=state.error;this.error=state.error?'local_error':'';}
 snapshot(){return {user:this.user?{id:this.user.id,email:this.user.email}:null,entries:clone(this.entries),loading:this.loading,saving:this.saving,error:this.error,pending:this.pending.length,enabled:!!this.client,epoch:this.epoch};}
 subscribe(fn){this.listeners.add(fn);return()=>this.listeners.delete(fn);}
 emit(){const state=this.snapshot();this.listeners.forEach(fn=>fn(state));}
 start(){
  if(!this.client)return;
  // Never call other Auth methods synchronously inside this SDK callback.
  this.subscription=this.client.auth.onAuthStateChange((event,session)=>{setTimeout(()=>{if(event==='INITIAL_SESSION'||event==='SIGNED_IN'||event==='SIGNED_OUT')this.setUser(session?.user||null);},0);}).data.subscription;
 }
 async setUser(user){
  if(this.initialized&&this.user?.id===user?.id)return;
  this.initialized=true;this.epoch++;this.user=user;this.pending=[];this.saving=false;this.flushing=null;this.entries=[];this.error='';this.loading=!!user;
  if(!user)this.loadGuest();
  this.emit();if(user)await this.refresh();
 }
 async refresh(){
  if(!this.user||this.pending.length||this.saving)return;
  const epoch=this.epoch,userId=this.user.id;this.loading=true;this.error='';this.emit();
  try{
   const rows=[];
   for(let start=0;;start+=200){
    const {data,error}=await this.client.from('ask_readings').select('id,payload,review,created_at').eq('user_id',userId).order('created_at',{ascending:false}).order('id').range(start,start+199);
    if(epoch!==this.epoch)return;if(error)throw error;rows.push(...data);if(data.length<200)break;
   }
   this.entries=rows.map(decodeRow);
  }catch{if(epoch===this.epoch)this.error='load_error';}
  finally{if(epoch===this.epoch){this.loading=false;this.emit();}}
 }
 guestEntries(){return readJournal(this.storage).entries;}
 saveGuest(){if(this.guestCorrupt||!writeJournal(this.storage,this.entries)){this.error='local_error';this.emit();return false;}this.error='';this.emit();return true;}
 async add(entry){
  if(!validEntry(entry))throw new Error('invalid_record');
  if(this.loading||this.error==='load_error')throw new Error('loading');
  if(this.entries.some(r=>r.id===entry.id))return true;
  this.entries.unshift(clone(entry));
  if(!this.user)return this.saveGuest();
  this.pending.push({kind:'add',entry:clone(entry)});this.emit();return this.flush();
 }
 async review(id,review){
  if(this.loading||this.error==='load_error')throw new Error('loading');
  const entry=this.entries.find(r=>r.id===id);if(!entry)return false;
  entry.review=cleanReview(review);
  if(!this.user)return this.saveGuest();
  this.pending.push({kind:'review',id,review:clone(entry.review)});this.emit();return this.flush();
 }
 async remove(id){
  if(this.loading||this.error==='load_error')throw new Error('loading');
  const before=this.entries;this.entries=this.entries.filter(r=>r.id!==id);
  if(!this.user){if(!this.saveGuest()){this.entries=before;this.emit();return false;}return true;}
  this.pending.push({kind:'delete',id});this.emit();return this.flush();
 }
 async importGuest(){
  if(!this.user||this.loading)throw new Error('not_ready');
  const existing=new Set(this.entries.map(r=>r.id));
  for(const entry of this.guestEntries())if(!existing.has(entry.id)){this.entries.push(clone(entry));this.pending.push({kind:'add',entry:clone(entry)});existing.add(entry.id);}
  this.emit();return this.flush();
 }
 async flush(){
  if(this.flushing)return this.flushing;
  if(!this.user)return false;
  if(!this.pending.length)return true;
  const epoch=this.epoch,userId=this.user.id;
  const work=async()=>{
   this.saving=true;this.error='';this.emit();
   try{
    while(this.pending.length&&epoch===this.epoch){
     const op=this.pending[0];let response;
     if(op.kind==='add'){
      const {review,...payload}=op.entry;
      response=await this.client.from('ask_readings').upsert({user_id:userId,id:op.entry.id,payload,review:cleanReview(review)},{onConflict:'user_id,id',ignoreDuplicates:true});
     }else if(op.kind==='review'){
      response=await this.client.from('ask_readings').update({review:op.review}).eq('user_id',userId).eq('id',op.id).select('id');
      if(!response.error&&!response.data?.length)throw new Error('deleted_elsewhere');
     }else response=await this.client.from('ask_readings').delete().eq('user_id',userId).eq('id',op.id);
     if(epoch!==this.epoch)return false;if(response.error)throw response.error;
     this.pending.shift();
    }
    return epoch===this.epoch;
   }catch{if(epoch===this.epoch)this.error='sync_error';return false;}
   finally{if(epoch===this.epoch){this.saving=false;this.flushing=null;this.emit();}}
  };
  this.flushing=work();return this.flushing;
 }
 async retry(){if(this.pending.length)return this.flush();return this.refresh();}
 async signOut(){
  const {error}=await this.client.auth.signOut({scope:'local'});
  if(error)throw error;
  await this.setUser(null);
 }
}

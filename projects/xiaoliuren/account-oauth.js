// Exchange the short-lived authorization code in this browser using the SDK's
// locally stored PKCE verifier. Never accept identity from URL parameters.
export async function finishOAuth(client,location,history){
 const url=new URL(location.href),fragment=new URLSearchParams(url.hash.slice(1));
 const code=url.searchParams.get('code');
 const denied=url.searchParams.has('error')||fragment.has('error');
 if(!code&&!denied)return {handled:false,error:false};
 let error=denied;
 try{if(code&&!denied){const response=await client.auth.exchangeCodeForSession(code);error=!!response.error;}}
 catch{error=true;}
 finally{
  for(const key of ['code','error','error_code','error_description'])url.searchParams.delete(key);
  url.hash=error?'#/':'#/history';
  history.replaceState(null,'',url.pathname+url.search+url.hash);
 }
 return {handled:true,error};
}
export function googleSignIn(client,base){
 const redirect=new URL('./',base);redirect.search='';redirect.hash='';
 return client.auth.signInWithOAuth({provider:'google',options:{redirectTo:redirect.href}});
}

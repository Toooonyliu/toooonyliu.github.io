import test from 'node:test';
import assert from 'node:assert/strict';
import {finishOAuth,googleSignIn} from '../account-oauth.js';
test('Google login returns to the same application folder without forwarding query parameters',async()=>{
 let call;await googleSignIn({auth:{signInWithOAuth:async value=>{call=value;return{};}}},'https://toooonyliu.github.io/projects/xiaoliuren/account-ui.js?v=ask18');
 assert.deepEqual(call,{provider:'google',options:{redirectTo:'https://toooonyliu.github.io/projects/xiaoliuren/'}});
});
test('successful PKCE callback exchanges the code and removes it from browser history',async()=>{
 let code,path;const result=await finishOAuth({auth:{exchangeCodeForSession:async c=>{code=c;return{error:null};}}},{href:'https://example.com/ask/?code=single-use'},{replaceState(a,b,p){path=p;}});
 assert.equal(code,'single-use');assert.equal(path,'/ask/#/history');assert.deepEqual(result,{handled:true,error:false});
});
test('cancelled or failed login clears auth parameters without trusting URL identity',async()=>{
 let called=false,path;const auth={exchangeCodeForSession:async()=>{called=true;throw Error('expired');}};
 let result=await finishOAuth({auth},{href:'https://example.com/ask/?error=access_denied'},{replaceState(a,b,p){path=p;}});
 assert.equal(called,false);assert.equal(result.error,true);assert.equal(path,'/ask/#/');
 result=await finishOAuth({auth},{href:'https://example.com/ask/?code=expired'},{replaceState(a,b,p){path=p;}});
 assert.equal(result.error,true);assert.equal(path,'/ask/#/');
});

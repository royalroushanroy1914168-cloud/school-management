const API_BASE="/api";
function currentUser(){try{return JSON.parse(localStorage.getItem("school_user")||"null")}catch{return null}}
function token(){return localStorage.getItem("school_token")}
function logout(){localStorage.removeItem("school_user");localStorage.removeItem("school_token");location.href="/index.html"}
function requireRole(...roles){
 const u=currentUser();
 if(!u){location.href="/index.html";return null}
 if(roles.length&&!roles.includes(u.role)){location.href="/index.html";return null}
 return u;
}
async function api(path,options={}){
 const headers=Object.assign({"Content-Type":"application/json"},options.headers||{});
 const t=token();if(t)headers.Authorization="Bearer "+t;
 const r=await fetch(API_BASE+path,{...options,headers});
 const d=await r.json().catch(()=>({success:false,message:"Invalid server response"}));
 if(r.status===401){logout();throw Error(d.message||"Login required")}
 if(!r.ok)throw Error(d.message||"Request failed");
 return d;
}
function esc(v){return String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}

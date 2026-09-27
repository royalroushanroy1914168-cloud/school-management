const API_BASE_URL="http://localhost:5000/api";
function token(){return localStorage.getItem("abc_school_token")}
function user(){try{return JSON.parse(localStorage.getItem("abc_school_user"))}catch{return null}}
function logout(){localStorage.removeItem("abc_school_token");localStorage.removeItem("abc_school_user");location.href="../index.html"}
function requireRole(role){const u=user();if(!u||u.role!==role){location.href=role==="admin"?"index.html":"../index.html";return false}return true}
async function api(path,opt={}){const r=await fetch(API_BASE_URL+path,{...opt,headers:{"Content-Type":"application/json",Authorization:"Bearer "+token(),...(opt.headers||{})}});const d=await r.json();if(!r.ok)throw Error(d.message||"Request failed");return d}
window.schoolAuth={token,user,logout,requireRole,api,esc:s=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))};
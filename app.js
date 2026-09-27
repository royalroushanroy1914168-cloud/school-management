const API="/api";
const routes={
 admin:"/admin-dashboard.html", principal:"/principal-dashboard.html", teacher:"/teacher-dashboard.html",
 student:"/student/profile.html", parent:"/parent/profile.html", accountant:"/accountant/fees.html",
 admission:"/admission/admissions.html", librarian:"/librarian/books.html",
 "exam-controller":"/exam-controller/exams.html", "notice-manager":"/notice-manager/notices.html"
};
const modal=document.getElementById("loginModal");
function openLogin(){modal.classList.add("open")}
function closeLogin(){modal.classList.remove("open")}
window.addEventListener("click",e=>{if(e.target===modal)closeLogin()});
document.getElementById("loginForm").addEventListener("submit",async e=>{
 e.preventDefault();
 const msg=document.getElementById("loginMessage"); msg.textContent="Signing in...";
 try{
  const r=await fetch(API+"/login",{method:"POST",headers:{"Content-Type":"application/json"},
   body:JSON.stringify({role:role.value,email:email.value.trim(),password:password.value})});
  const d=await r.json();
  if(!r.ok||!d.success){msg.textContent=d.message||"Invalid login details";return}
  localStorage.setItem("school_token",d.token);localStorage.setItem("school_user",JSON.stringify(d.user));
  location.href=routes[d.user.role]||"/";
 }catch(x){msg.textContent="Server connection failed";}
});

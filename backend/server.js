const express=require("express");
const path=require("path");
const cors=require("cors");
const bcrypt=require("bcrypt");
const jwt=require("jsonwebtoken");
const {Pool}=require("pg");
const fs=require("fs");
const {auth,allow,SECRET}=require("./middleware/auth");

const app=express();
const PORT=process.env.PORT||10000;
const frontendPath=path.join(__dirname,"..");

app.use(cors());
app.use(express.json({limit:"2mb"}));
app.use(express.urlencoded({extended:true}));
app.use(express.static(frontendPath));

const pool=new Pool({
 connectionString:process.env.DATABASE_URL,
 ssl:process.env.DATABASE_URL?{rejectUnauthorized:false}:false
});
const db=(q,p=[])=>pool.query(q,p);

async function setup(){
 const schema=fs.readFileSync(path.join(__dirname,"database","schema.sql"),"utf8");
 await db(schema);
 const email=process.env.ADMIN_EMAIL||"admin@school.com";
 const pass=process.env.ADMIN_PASSWORD||"admin123";
 const exists=await db("SELECT id FROM users WHERE role='admin' LIMIT 1");
 if(!exists.rows.length){
   await db("INSERT INTO users(name,email,password,role) VALUES($1,$2,$3,$4)",
   ["School Administrator",email,await bcrypt.hash(pass,12),"admin"]);
   console.log("Default admin created");
 }else console.log("Admin account already exists");
}

app.get("/",(req,res)=>res.sendFile(path.join(frontendPath,"index.html")));
app.get("/api/health",async(req,res)=>{
 try{await db("SELECT 1");res.json({success:true,message:"ABC Public School API is running",database:"PostgreSQL connected"})}
 catch(e){res.status(500).json({success:false,message:"Database connection failed"})}
});

app.post("/api/login",async(req,res)=>{
 try{
  const {email,password,role}=req.body;
  const r=await db("SELECT id,name,email,password,role FROM users WHERE LOWER(email)=LOWER($1) AND role=$2 LIMIT 1",[email,role]);
  if(!r.rows.length||!(await bcrypt.compare(password,r.rows[0].password)))
   return res.status(401).json({success:false,message:"Invalid login details"});
  const u=r.rows[0],safe={id:u.id,name:u.name,email:u.email,role:u.role};
  res.json({success:true,token:jwt.sign(safe,SECRET,{expiresIn:"8h"}),user:safe});
 }catch(e){console.error(e);res.status(500).json({success:false,message:"Login failed"})}
});

app.get("/api/users",auth,allow("admin"),async(req,res)=>{
 const r=await db("SELECT id,name,email,role,created_at FROM users ORDER BY id DESC");
 res.json({success:true,users:r.rows});
});
app.post("/api/users",auth,allow("admin"),async(req,res)=>{
 try{
  const {name,email,password,role}=req.body;
  if(!name||!email||!password||!role)return res.status(400).json({success:false,message:"All fields are required"});
  const r=await db("INSERT INTO users(name,email,password,role) VALUES($1,$2,$3,$4) RETURNING id,name,email,role",
  [name,email,await bcrypt.hash(password,12),role]);
  res.status(201).json({success:true,user:r.rows[0]});
 }catch(e){res.status(400).json({success:false,message:"Could not create account. Email may already exist."})}
});
app.delete("/api/users/:id",auth,allow("admin"),async(req,res)=>{
 await db("DELETE FROM users WHERE id=$1",[req.params.id]);res.json({success:true});
});

app.get("/api/students",auth,async(req,res)=>{
 const r=await db("SELECT * FROM students ORDER BY id DESC");res.json({success:true,students:r.rows});
});
app.post("/api/students",auth,allow("admin","principal","admission"),async(req,res)=>{
 try{
  const {admission_no,name,class_name,section,roll_no,parent_name,phone}=req.body;
  const r=await db("INSERT INTO students(admission_no,name,class_name,section,roll_no,parent_name,phone) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *",
  [admission_no,name,class_name,section,roll_no,parent_name,phone]);
  res.status(201).json({success:true,student:r.rows[0]});
 }catch(e){res.status(400).json({success:false,message:"Could not add student"})}
});

app.get("/api/admissions",auth,async(req,res)=>{
 const r=await db("SELECT * FROM admissions ORDER BY id DESC");res.json({success:true,admissions:r.rows});
});
app.post("/api/admissions",auth,allow("admin","principal","admission"),async(req,res)=>{
 try{
  const {application_no,student_name,class_name,parent_name,phone}=req.body;
  const r=await db("INSERT INTO admissions(application_no,student_name,class_name,parent_name,phone) VALUES($1,$2,$3,$4,$5) RETURNING *",
  [application_no,student_name,class_name,parent_name,phone]);
  res.status(201).json({success:true,admission:r.rows[0]});
 }catch(e){res.status(400).json({success:false,message:"Could not save admission"})}
});

app.get("/api/notices",auth,async(req,res)=>{
 const r=await db("SELECT * FROM notices WHERE published=true ORDER BY id DESC");res.json({success:true,notices:r.rows});
});
app.post("/api/notices",auth,allow("admin","principal","teacher","notice-manager"),async(req,res)=>{
 const {title,body,target_role="all",published=true}=req.body;
 const r=await db("INSERT INTO notices(title,body,target_role,published) VALUES($1,$2,$3,$4) RETURNING *",[title,body,target_role,published]);
 res.status(201).json({success:true,notice:r.rows[0]});
});

app.get("/api/attendance",auth,async(req,res)=>{const r=await db("SELECT * FROM attendance ORDER BY id DESC");res.json({success:true,attendance:r.rows})});
app.post("/api/attendance",auth,allow("admin","principal","teacher"),async(req,res)=>{
 const {student_id,attendance_date,status}=req.body;
 const r=await db("INSERT INTO attendance(student_id,attendance_date,status) VALUES($1,$2,$3) RETURNING *",[student_id,attendance_date,status]);
 res.status(201).json({success:true,attendance:r.rows[0]});
});

app.get("/api/exams",auth,async(req,res)=>{const r=await db("SELECT * FROM exams ORDER BY id DESC");res.json({success:true,exams:r.rows})});
app.post("/api/exams",auth,allow("admin","principal","teacher","exam-controller"),async(req,res)=>{
 const {name,subject,class_name,exam_date}=req.body;
 const r=await db("INSERT INTO exams(name,subject,class_name,exam_date) VALUES($1,$2,$3,$4) RETURNING *",[name,subject,class_name,exam_date]);
 res.status(201).json({success:true,exam:r.rows[0]});
});

app.get("/api/marks",auth,async(req,res)=>{const r=await db("SELECT * FROM marks ORDER BY id DESC");res.json({success:true,marks:r.rows})});
app.post("/api/marks",auth,allow("admin","principal","teacher","exam-controller"),async(req,res)=>{
 const {student_id,exam_id,marks,max_marks=100,published=false}=req.body;
 const r=await db("INSERT INTO marks(student_id,exam_id,marks,max_marks,published) VALUES($1,$2,$3,$4,$5) RETURNING *",[student_id,exam_id,marks,max_marks,published]);
 res.status(201).json({success:true,mark:r.rows[0]});
});

app.get("/api/fees",auth,async(req,res)=>{const r=await db("SELECT * FROM fees ORDER BY id DESC");res.json({success:true,fees:r.rows})});
app.post("/api/fees",auth,allow("admin","principal","accountant"),async(req,res)=>{
 const {student_id,amount,paid=0,description,payment_date}=req.body;
 const r=await db("INSERT INTO fees(student_id,amount,paid,description,payment_date) VALUES($1,$2,$3,$4,$5) RETURNING *",[student_id,amount,paid,description,payment_date]);
 res.status(201).json({success:true,fee:r.rows[0]});
});

app.get("/api/books",auth,async(req,res)=>{const r=await db("SELECT * FROM books ORDER BY id DESC");res.json({success:true,books:r.rows})});
app.post("/api/books",auth,allow("admin","principal","librarian"),async(req,res)=>{
 const {title,author,isbn,quantity=1}=req.body;
 const r=await db("INSERT INTO books(title,author,isbn,quantity,available) VALUES($1,$2,$3,$4,$4) RETURNING *",[title,author,isbn,quantity]);
 res.status(201).json({success:true,book:r.rows[0]});
});

/* Root dashboard is intentional */
app.get("/admin-dashboard.html",(req,res)=>res.sendFile(path.join(frontendPath,"admin-dashboard.html")));
app.get("/principal-dashboard.html",(req,res)=>res.sendFile(path.join(frontendPath,"principal-dashboard.html")));
app.get("/teacher-dashboard.html",(req,res)=>res.sendFile(path.join(frontendPath,"teacher-dashboard.html")));

["admission","students","teacher","principal","exam","attendance","marks","fees","notices","setting"]
.forEach(p=>app.get(`/admin/${p}.html`,(req,res)=>res.sendFile(path.join(frontendPath,"admin",p+".html"))));

const rolePages={
 principal:["admission","students","teachers","attendance","exams","marks","fees","notices"],
 teacher:["students","classes","attendance","marks"],
 student:["profile","attendance","results","notices","fees"],
 parent:["profile","attendance","results","notices","fees"],
 accountant:["fees","reports"],
 admission:["admissions","students"],
 librarian:["books"],
 "exam-controller":["exams","marks","results"],
 "notice-manager":["notices"]
};
for(const [role,pages] of Object.entries(rolePages))
 pages.forEach(p=>app.get(`/${role}/${p}.html`,(req,res)=>res.sendFile(path.join(frontendPath,role,p+".html"))));

app.use("/api",(req,res)=>res.status(404).json({success:false,message:"API endpoint not found"}));
app.use((req,res)=>res.status(404).send("<h1 style='font-family:Arial;text-align:center;margin-top:80px'>404 - Page Not Found</h1>"));

setup().then(()=>app.listen(PORT,"0.0.0.0",()=>console.log("ABC Public School server running on port "+PORT)))
.catch(e=>{console.error("Startup error:",e);process.exit(1)});

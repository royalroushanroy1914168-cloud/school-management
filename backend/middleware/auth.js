const jwt=require("jsonwebtoken");
const SECRET=process.env.JWT_SECRET||"change-this-secret";
function auth(req,res,next){
 const h=req.headers.authorization||"", token=h.startsWith("Bearer ")?h.slice(7):null;
 if(!token)return res.status(401).json({success:false,message:"Login required"});
 try{req.user=jwt.verify(token,SECRET);next()}catch(e){res.status(401).json({success:false,message:"Invalid or expired login"})}
}
function allow(...roles){return(req,res,next)=>roles.includes(req.user?.role)?next():res.status(403).json({success:false,message:"Access denied"})}
module.exports={auth,allow,SECRET};

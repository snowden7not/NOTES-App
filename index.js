require ("dotenv").config();
const mongoose=require("mongoose");

const { ObjectId } = mongoose.Types; //used in /reset-password/:id/:token, while while checking id is objectId or not.

mongoose.connect(process.env.connectionString);

const bcrypt = require("bcrypt");

const encryption = require('node-encryption');
const key = process.env.enc_key;

const nodemailer = require("nodemailer");

const User = require("./models/user.model");
const Note = require("./models/note.model");

const express=require('express');

const cors=require('cors');
const app= express();

const jwt = require('jsonwebtoken');
const {authenticateToken}= require("./utilities");

app.use(express.json());

app.use(cors({
    origin:"*",
}));


//app.get("/",(req,res)=>{
//    res.json({data:"hello bs"});
//});


//create account
app.post("/create-account", async(req,res)=>{
    const {fullName,email,password} = req.body;

    if(!fullName){
        return res.status(400).json({error:true,message:"FullName is required"});
    }
    if(!email){
        return res.status(400).json({error:true,
    message:"Email is required"});
    }
    if(!password){
        return res.status(400).json({error:true,
    message:"Password is required"});
    }

    const isUser = await User.findOne({email:email});

    if(isUser){
        return res.json({error:true,message:"User already exists",});
    }

    //bcrypt start
    let hashedPassword;
    try{
        hashedPassword = await bcrypt.hash(password, 10);
    }
    catch(err) {
        return res.status(500).json({
            success:false,
            message:'Error in hashing Password',
        });
    }
    //bcrypt end

    const user = new User({fullName,email,password:hashedPassword});

    await user.save();

    const accessToken=jwt.sign(
        {user}, 
        process.env.ACCESS_TOKEN_SECRET,
        {expiresIn:"10h"}
    ); 

    return res.json({
        error:false,
        user,
        accessToken,
        message:"Registration Successful"
    });
})

//login
app.post("/", async(req,res)=>{
    const {email,password} = req.body;

    if(!email){
        return res.status(400).json({error:true,message:"Email is required"});
    }
    if(!password){
        return res.status(400).json({error:true,message:"Password is required"});
    }

    const userInfo = await User.findOne({email:email});

    if(!userInfo){
        return res.status(400).json({error:true,message:"User NOT Found",});
    }

    //if(userInfo.email == email && userInfo.password == password){
    if(userInfo.email == email && await bcrypt.compare(password,userInfo.password)){
        const user={user:userInfo};
        const accessToken = jwt.sign(user,process.env.ACCESS_TOKEN_SECRET,{expiresIn:"36000m"});

        return res.json({error:false,message:"Login Successfull",email,accessToken});
    }
    else{
        return res.status(400).json({error:true,message:"Invalid Credentials"})
    }
});

//forgot-password (sends link to mail) 
app.post('/forgot-password', async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email:email });
    if(!user){
        console.log("User not found");
        return res.json({error:true,message:"User doesn't exist.",});
    }

    const token = jwt.sign( 
        { id: user._id }, 
        process.env.ACCESS_TOKEN_SECRET, 
        { expiresIn: '5m' } , //36000m while debugging  
    ); 

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.MAIL_USER, 
        pass: process.env.MAIL_PASS, 
      },
    });

    const link=`https://notes-front-1.onrender.com/${user._id}/${token}`
    //console.log(link); //comment it

    const mailOptions = {
      from: process.env.MAIL_USER,
      to: email,
      subject: 'Reset Password for NOTES by clicking on the below LINK',
      //text: link,
      html: `
            <p>Hi there,</p>
            <p>You recently requested a password reset for your NOTES account.</p>
            <p>To reset your password, please click on the button below:</p>
            <a href="${link}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-align: center; text-decoration: none; display: inline-block; font-size: 16px;">Reset Password</a>
            <p>If you did not request a password reset, please ignore this email.</p>
            <p>This password reset link will expire in 5 minutes for security purposes.</p>
            <p>Sincerely,</p>
            <p>The NOTES Team</p>
        `,
    };
    
    await transporter.sendMail(mailOptions);
  } 
  catch (error) {
    console.error(error);
    return res.status(500).json({
        error:true,
        message:'Error in hashing Password',
    });
  }

  return res.status(200).json({ 
    success:true,
    email,
    message: 'check your mail, for password reset link.' ,
  });
});

//reset password 
app.post('/reset-password/:id/:token', async(req, res) => {
    const {id, token} = req.params
    const {password} = req.body

    if (!password) {
        return res.status(400).json({ error: true, message: "Password is required" });
    }

    /*console.log("in reset password of backend")
    console.log(`${id}`);
    console.log(`${token}`);
    console.log(`${password}`);*/

    try {
      var tokenError = false;
      jwt.verify(token,process.env.ACCESS_TOKEN_SECRET, (err,user)=>{
        //console.log("in verify,in reset password of backend")
        if(err){  
            tokenError=true ;
            //console.log("got error in verify jwt,in reset password of backend");
        }
      })

      if (!ObjectId.isValid(id) ||tokenError ) {
        return res.status(400).json({error:true,message:"Token expired or Tampered link detected.",});
      }

      const user = await User.findOne({ _id: id });
      if (!user) {
        return res.status(400).json({error:true,message:"Tampered link detected or user NOT found.",});
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      await User.findByIdAndUpdate({ _id: id }, { password: hashedPassword });
      //console.log("passed verify,in hashing,in reset password of backend") ;
      //console.log(`${hashedPassword}`);
      res.status(200).json({ success: true, message: "Password Updated" });
    } 
    catch (err) {
      //console.error(err);
      res.status(500).json({ error: true, message: response.data.message });
    }
});

//get-user
app.get("/get-user", authenticateToken, async(req,res)=>{
    const {user} = req.user;
    const isUser = await User.findOne({_id:user._id});

    if(!isUser){
        return res.sendStatus(401);
    }

    return res.json({
        user:{
            fullName: isUser.fullName,
            email: isUser.email,
            _id: isUser._id, 
            createdOn: isUser.createdOn,
        }, 
        message:"" 
    })
});

//add-note
app.post("/add-note", authenticateToken, async(req,res)=>{
    const { title,content,tags}=req.body;
    const {user} =req.user;
    
    /*if(!title){return res.status(400).json({error:true,message:"Title is required"});}
    if(!content){return res.status(400).json({error:true,message:"Content is required"});}*/

    const encryptedTitle = encryption.encrypt(title, key);
    const encryptedContent = encryption.encrypt(content, key);

    try{
        const note=new Note({
            title:encryptedTitle || "",
            imageUrl:res.secure_url || "",
            content:encryptedContent || "" ,
            tags:tags || [],
            userId:user._id,
        });
        await note.save();

        return res.json({
            error:false,
            note,
            /*note: {
                title:encryption.decrypt(note.title, key).toString(),
                content: note.content,
                createdOn: note.createdOn,
                isPinned: note.isPinned,
                tags: note.tags,
                userId: note.userId,
                __v: note.__v,
                _id: note._id
            },*/
            message:"Note added successfully",
        });
    }
    catch(error){
        return res.status(500).json({
            error:true,
            message:"Internal Server Error",
        })
    }
});

//edit-note
app.put("/edit-note/:noteId", authenticateToken, async(req,res)=>{
    const noteId=req.params.noteId;
    const {title, content, tags, isPinned} = req.body;
    const {user}=req.user;

    if(!title && !content && !tags){
        return res.status(400).json({error:true, message:"No changes provided"});
    }

    try{
        const note = await Note.findOne({_id:noteId, userId:user._id});

        if(!note){
            return res.status(404).json({error:true, message:"Note not found"});
        }

        const encryptedTitle = encryption.encrypt(title, key);
        const encryptedContent = encryption.encrypt(content, key);

        //if(title|| "") note.title = encryptedTitle;
        //if(content || "") note.content = encryptedContent;
        if(title|| title=="") note.title = encryptedTitle;
        if(content || content=="") note.content = encryptedContent;
        if(tags) note.tags = tags;
        if(isPinned) note.isPinned = isPinned;

        await note.save();

        return res.json({error:false, note, message:"Note Updated successfully"});
    }
    catch(error){
        return res.status(500).json({error:true, message:"Internal Server Error"});
    }
}); 

//get-all-notes
app.get("/get-all-notes/", authenticateToken, async(req,res)=>{
    const {user}=req.user;
    
    try{
        const notes=await Note.find({userId:user._id}).sort({isPinned:-1});

        for (const note of notes) {
            try{
                note.title = encryption.decrypt(note.title, key).toString();
                note.content = encryption.decrypt(note.content, key).toString();
                //console.log(note.title);
            }
            catch(e){
                console.log("error in encryption,cipher text is: ", note.title);
            }
        }
        
        return res.json({
            error:false,
            notes,
            message:"All notes retrieved successfully"
        })
    }
    catch(error){
        return res.status(500).json({error:true, message:"Internal server error"})
    }
})

//delete-note
app.delete("/delete-note/:noteId", authenticateToken, async(req,res)=>{
    const noteId=req.params.noteId;
    const {user}=req.user;

    try{
        const note = await Note.findOne({_id:noteId, userId:user._id});

        if(!note){
            return res.status(404).json({error:true, message:"Note not found"});
        }

        await note.deleteOne({_id:noteId, userId:user._id});

        return res.json({error:false,message:"Note deleted successfully"});
    }
    catch(error){
        return res.status(500).json({error:true, message:"Internal Server Error"});
    } 
})

//update isPinned value
app.put("/update-note-pinned/:noteId", authenticateToken, async(req,res)=>{
    const noteId=req.params.noteId;
    const {isPinned} = req.body;
    const {user}=req.user;

    try{
        const note = await Note.findOne({_id:noteId, userId:user._id});

        if(!note){
            return res.status(404).json({error:true, message:"Note not found"});
        }

        note.isPinned = isPinned ;

        await note.save();

        return res.json({error:false, note, message:"Note Updated successfully"});
    }
    catch(error){
        return res.status(500).json({error:true, message:"Internal Server Error"});
    }
}); 

//search-notes
app.get("/search-notes", authenticateToken, async(req,res)=>{
    const {user}=req.user;
    const {query}=req.query;

    if(!query){
        return res.status(400).json({error:true, message:"Search query is required"});
    }

    try{
        const matchingNotes=await Note.find({
            userId: user._id,
            $or:[
                {title:{$regex: new RegExp(query,"i")}},
                {content: {$regex:new RegExp(query,"i")}},
                //{tags: {$regex:new RegExp(query,"i")}},
                { tags: { $in: [ new RegExp(query, "i")] } }
            ],
        });
        
        for (const note of matchingNotes) {
            try{
                note.title = encryption.decrypt(note.title, key).toString();
                note.content = encryption.decrypt(note.content, key).toString();
                //console.log(note.title);
            }
            catch(e){
                console.log("error in encryption,cipher text is: ", note.title);
            }
        }

        return res.json({
            error:false,
            notes:matchingNotes,
            message:"Notes matching the search query retrieved successfully"
        })
    }
    catch(error){
        return res.status(500).json({
            error:true,
            message:"Internal server error",
        });
    }
})

app.listen(process.env.PORT);

module.exports=app;

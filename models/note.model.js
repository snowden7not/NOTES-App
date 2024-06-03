const mongoose=require("mongoose");
const Schema = mongoose.Schema;

const noteSchema=new Schema({
    title: { type:String },
    imageUrl: { type: String },
    content:{type:String, },
    tags:{type:[String],default:[]},
    isPinned:{type:Boolean,default:false},
    userId:{type:String,required:true},
    createdOn:{type:Date,default:new Date().getTime()},
});

module.exports=mongoose.model("Note",noteSchema);

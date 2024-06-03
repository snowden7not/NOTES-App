const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const userSchema=new Schema({
    fullName:{type:Object},
    email:{type:String},
    password:{type:String},
    createdOn:{type:Date, default:new Date().getTime()},
})

// In your User model (mongoose schema)
/*userSchema.methods.generatePasswordResetToken = function () {
    const crypto = require('crypto');
    const resetToken = crypto.randomBytes(20).toString('hex');
    const resetTokenExpiration = Date.now() + 3600000; // 1 hour in milliseconds

    this.passwordResetToken = resetToken;
    this.passwordResetExpires = resetTokenExpiration;

    return resetToken;
};*/


module.exports = mongoose.model("User",userSchema);

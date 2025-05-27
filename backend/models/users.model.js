const mongoose = require("mongoose")

const userSchema = mongoose.Schema({
    _id: { type: String, required: false },
    firstName: { type: String, required: false },
    lastName: { type: String, required: false },
    email: {
        type: String,
        required: true,
        unique: true,
        match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address']
    },
    password: { type: String, required: true, minlength: 8 },
    // trialRemainingDays: { type: Number, default: 30 },
    verificationCode: { type: String }, // Field to store the 12-digit code
    codeUsed: { type: Boolean, default: false },
    trialStartDate: { type: Date },
    isTrialActive: { type: Boolean, default: false } // Flag to check if the trial ended or started has been used
},
    {
        timestamps: true
    }
)

const user = mongoose.model("User", userSchema)

// export default user
module.exports = user
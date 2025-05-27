const mongoose = require("mongoose")

const subscriptionSchema = mongoose.Schema({
    _id: { type: String, required: false },
    userId: {
        // 
        type: String,
        ref: 'User',
        required: true
    },
    purchaseDate: { type: Date, required: true },
    subscriptionType: { type: String, required: true },
    subscriptionStatus: { type: Boolean }
},
    {
        timestamps: true
    }
)

const subscription = mongoose.model("SubscriptionDetail", subscriptionSchema)

module.exports = subscription
const User = require("../models/users.model.js")

const checkTrialPeriod = async (req, res, next) => {
    // console.log("Check trial period ", req.body.email)

    const userResult = await User.findOne({ email: req.body.email });
    if (!userResult) {
        return res.status(401).send('User not found');
    }

    const currentDate = new Date();
    const trialStartDate = new Date(userResult.trialStartDate);
    const diffDays = Math.floor((currentDate - trialStartDate) / (1000 * 60 * 60 * 24));

    if (diffDays > 7) {
        userResult.isTrialActive = false;
        await userResult.save();
        // return userResult.status(403).send('Your trial period has expired.');
        // return res.status(200).send('Your trial period has expired.');
    }

    next();
};

module.exports = checkTrialPeriod;

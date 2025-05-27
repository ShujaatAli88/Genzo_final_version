const User = require("../models/users.model.js")

const checkCodeVerification = async (req, res, next) => {
    const user = await User.findOne({ email: req.body.email });
    if (!user) {
        return res.status(401).send('User not found');
    }
    if (!user.codeUsed) {
        return res.status(401).send('Code not used');
    }

    next()
}

module.exports = checkCodeVerification
const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const Users = require('../models/users.model');

const protect = asyncHandler(async (req, res, next) => {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = await Users.findById(decoded.id).select('-password');
            next();
        } catch (error) {
            res.status(401).send('Not Authorized');
            // throw new Error('Not Authorized');
        }
    }
    if (!token) {
        res.status(401).send('Not Authorized, No Token');
        // throw new Error('Not Authorized, No Token');
    }
});

module.exports = { protect };
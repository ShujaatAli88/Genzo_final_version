const Subscription = require("../models/subscriptionDetail.model")
const User = require("../models/users.model")

// Function to check the number of days in a month
function getDaysInMonth(year, month) {
    return new Date(year, month, 0).getDate();
}

// Function to check the number of days in a year
function getDaysInYear(year) {
    let days = 0;
    for (let month = 0; month < 12; month++) {
        days += new Date(year, month + 1, 0).getDate(); // Get the last day of each month
    }
    return days;
}

const subscriptionDetailCheck = async (req, res, next) => {
    console.log("Subscription Check middleware: ", req.body.email)

    const userResult = await User.findOne({ email: req.body.email });
    if (!userResult) {
        return res.status(401).send('User not found');
    }
    const subDetail = await Subscription.find({ userId: userResult._id });
    if (!subDetail) {
        res.status().send("401").send("User has not subscribed to any plan.")
    }

    const currentDate = new Date()
    const subStartDate = new Date(subDetail.purchaseDate)
    const monthNumber = subStartDate.getMonth() + 1;
    const year = subStartDate.getFullYear()

    // console.log("User: ", userResult, " Subscription:", subDetail, "Purchase Date: ", subStartDate)

    if (subDetail.subscriptionType == "Monthly Plan") {
        const daysInMonth = getDaysInMonth(year, monthNumber)
        // console.log("Days in months: ", daysInMonth)
        const diffDays = Math.floor((currentDate - subStartDate) / (1000 * 60 * 60 * 24));
        // console.log("Days difference: ", diffDays)
        if (daysInMonth == 28 && diffDays > 28) {
            subDetail.subscriptionStatus = false
            subDetail.save()
            // next()
            // return res.status(403).send('Your subscription period has expired.')
        }
        else if (daysInMonth == 29 && diffDays > 29) {
            subDetail.subscriptionStatus = false
            subDetail.save()
            // next()
            // return res.status(403).send('Your subscription period has expired.')
        }
        else if (daysInMonth == 30 && diffDays > 30) {
            subDetail.subscriptionStatus = false
            subDetail.save()
            // next()
            // return res.status(403).send('Your subscription period has expired.')
        }
        else if (daysInMonth == 31 && diffDays > 31) {
            subDetail.subscriptionStatus = false
            subDetail.save()
            // next()
            // return res.status(403).send('Your subscription period has expired.')
        }
        else {
            // console.log("Hello, i just got executed")
            // return res.send("Your are currently subscribed to our Monthly Plan")
            // next()
            // return res.status(200).send('Your are currently subscribed to our Monthly Plan.')
        }
    }
    else if (subDetail.subscriptionType == "Yearly Plan") {
        const daysInYear = getDaysInYear(year)
        const diffDays = Math.floor((currentDate - subStartDate) / (1000 * 60 * 60 * 24));
        if ((daysInYear == 365 && diffDays > 365) || (daysInYear == 366 && diffDays > 366)) {
            subDetail.subscriptionStatus = false
            subDetail.save()
            // next()
            // return res.status(403).send('Your subscription period has expired.')
        }
        // else {
        //     next()
        //     return res.status(200).send('Your are currently subscribed to our Yearly Plan.')
        // }
    }
    next()
}

module.exports = subscriptionDetailCheck 